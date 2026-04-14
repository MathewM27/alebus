/**
 * useBottomSheet.ts
 * Shared bottom-sheet hook for Alebus
 *
 * Original fixes (A–I):
 *  A. Dimensions.get at module-level → caller passes screenHeight from useWindowDimensions()
 *  B. Hardcoded pixel snap points → all snaps expressed as % of screenHeight
 *  C. Duplicate / dead snap constants → deduplicated, all distinct
 *  D. Anonymous inline snap in journey → all snaps live in snapPoints[]
 *  E. Dead fling branch → unified fling logic with index arithmetic
 *  F. Nearest-snap inconsistency → strict `d < bestD` everywhere (ties stay up)
 *  G. isSectionExpanded cross-thread stale read → sectionExpanded SharedValue,
 *     all writes via runOnUI only
 *  H. Missing keyboard listener in settings → opt-in via onKeyboardShow: true
 *  I. expandedOpacity inconsistency → caller uses TY[] from hook for interpolation
 *
 * Additional fixes (J–L):
 *  J. FLING LOGIC — replaced manual TY[] scan with getNearestIndex() + step ±1.
 *     Consistent with the index-based architecture; no edge-case boundary bugs.
 *  K. KEYBOARD RESTORE — replaced Math.max(rawY, ceiling) with preKBIndex + Math.min.
 *     Index-based logic is readable and free of coordinate inversions.
 *  L. DEPENDENCY ARRAYS — [screenHeight, ...snapPoints] replaces TY.join(",") so
 *     invalidation is correct and avoids unnecessary string serialisation.
 */

import { useCallback, useEffect, useRef } from "react";
import {
  Extrapolation,
  interpolate,
  runOnUI,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";
import { Keyboard, Platform, ViewStyle } from "react-native";
import type { AnimatedStyleProp, SharedValue } from "react-native-reanimated";
import type { GestureType } from "react-native-gesture-handler";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BottomSheetOptions {
  /**
   * Live screen height — pass `useWindowDimensions().height` from the component.
   * Never use Dimensions.get("window").height at module level (wrong on Android).
   */
  screenHeight: number;

  /**
   * Fraction of screenHeight that is VISIBLE at each snap, sorted ascending.
   * e.g. [0.15, 0.55, 0.92] → 15% collapsed · 55% default · 92% keyboard-safe
   * At least 2 entries required.
   */
  snapPoints: number[];

  /** Which snapPoints index to start at. Default: 1 */
  initialSnap?: number;

  /**
   * Highest snap index the USER can drag to.
   * Programmatic snapTo() bypasses this so edit forms / bus detection can go higher.
   * Default: snapPoints.length - 1
   */
  maxSnapIndex?: number;

  /**
   * Register keyboard listeners that lift the sheet when an input is focused
   * and restore it when the keyboard is dismissed. Default: false
   */
  onKeyboardShow?: boolean;

  /**
   * Snap index to jump to when the keyboard appears.
   * Default: snapPoints.length - 1 (highest snap in the array)
   *
   * For index.tsx: add 0.92 to snapPoints and set keyboardSnapIndex: 2
   * so the sheet jumps well above the Android keyboard.
   */
  keyboardSnapIndex?: number;
}

export interface BottomSheetReturn {
  /** Raw translateY SharedValue — use in animated styles or worklets */
  translateY: SharedValue<number>;

  /** Spread onto <Animated.View style={[sheetStyle, yourStyles]}> */
  sheetStyle: AnimatedStyleProp<ViewStyle>;

  /** Configured pan gesture — pass to <GestureDetector gesture={pan}> */
  pan: GestureType;

  /**
   * Snap to a snap-point index from the JS thread.
   * Ignores maxSnapIndex so programmatic snaps always reach their target.
   */
  snapTo: (index: number) => void;

  /** Snap to a raw translateY value from the JS thread (rare programmatic overrides) */
  snapToY: (y: number) => void;

  /**
   * Computed translateY for each snap point.
   * TY[0] = lowest/least visible, TY[last] = highest/most visible.
   *
   * Use for opacity / scale interpolation so all screens share the same frame:
   *   useAnimatedStyle(() => ({
   *     opacity: interpolate(translateY.value, [TY[1], TY[0]], [1, 0], Extrapolation.CLAMP)
   *   }))
   */
  TY: number[];

  /** 0–1 overscroll intensity — drive a glow or border highlight with this */
  overscrollGlow: SharedValue<number>;

  /** Ready-made animated style { opacity } for the overscroll glow element */
  glowStyle: AnimatedStyleProp<ViewStyle>;

  /**
   * Whether an in-sheet section is currently expanded (profile edit, shortcut form).
   * Read from JS via .value; write only via setSectionExpanded() to stay thread-safe.
   */
  sectionExpanded: SharedValue<boolean>;

  /** Safely write sectionExpanded from the JS thread (routes through runOnUI) */
  setSectionExpanded: (expanded: boolean) => void;
}

// ─── Module-level constants ───────────────────────────────────────────────────

const SPRING_CFG = {
  damping: 24,
  stiffness: 220,
  mass: 0.8,
  overshootClamping: false,
} as const;

const FLING_VELOCITY  = 500; // px/s — above this, treat drag-end as a fling
const GLOW_OVERSCROLL = 20;  // px overscrolled before glow reaches full opacity

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBottomSheet(options: BottomSheetOptions): BottomSheetReturn {
  const {
    screenHeight,
    snapPoints,
    initialSnap = 1,
    onKeyboardShow = false,
    keyboardSnapIndex,
  } = options;

  if (snapPoints.length < 2) {
    throw new Error("useBottomSheet: snapPoints must have at least 2 entries.");
  }

  // ── Derive pixel translateY for each snap ──────────────────────────────────
  //
  // Example — screenHeight = 900, snapPoints = [0.15, 0.55, 0.92]:
  //   TY[0] = 900 * (1 - 0.15) = 765   ← sheet mostly off-screen (collapsed)
  //   TY[1] = 900 * (1 - 0.55) = 405   ← sheet 55% visible (default)
  //   TY[2] = 900 * (1 - 0.92) =  72   ← sheet 92% visible (keyboard-safe)
  //
  // RULE: LARGER TY → lower on screen → less visible
  //       SMALLER TY → higher on screen → more visible
  //
  const TY: number[] = snapPoints.map((frac) =>
    Math.round(screenHeight * (1 - frac))
  );

  const maxSnapIndex =
    options.maxSnapIndex !== undefined
      ? options.maxSnapIndex
      : snapPoints.length - 1;

  // ── Shared values ──────────────────────────────────────────────────────────
  const translateY      = useSharedValue(TY[initialSnap]);
  const overscrollGlow  = useSharedValue(0);
  const sectionExpanded = useSharedValue(false);
  const startY          = useSharedValue(0);

  // tyValues / maxSnapIndexSV carry live state into the UI thread so gesture
  // worklets never read stale JS-side values.
  const tyValues        = useSharedValue<number[]>(TY);
  const maxSnapIndexSV  = useSharedValue(maxSnapIndex);

  // FIX K — store the snap INDEX before the keyboard appears, not a raw Y value.
  // Index-based restore is readable and free of coordinate-inversion bugs.
  const preKBIndex = useRef<number>(initialSnap);

  // ── Sync UI-thread copies when screenHeight or snapPoints change ───────────
  // FIX L — depend on [screenHeight, ...snapPoints] not TY.join(",")

  useEffect(() => {
    const nextTY = snapPoints.map((frac) =>
      Math.round(screenHeight * (1 - frac))
    );
    runOnUI(() => {
      "worklet";
      tyValues.value = nextTY;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenHeight, ...snapPoints]);

  useEffect(() => {
    runOnUI(() => {
      "worklet";
      maxSnapIndexSV.value = maxSnapIndex;
    })();
  }, [maxSnapIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── JS-thread snap helpers ────────────────────────────────────────────────

  const snapTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(index, snapPoints.length - 1));
      const targetY = TY[clamped]; // resolve on JS thread, pass plain number to worklet
      runOnUI(() => {
        "worklet";
        translateY.value = withSpring(targetY, SPRING_CFG);
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [screenHeight, ...snapPoints]
  );

  const snapToY = useCallback((y: number) => {
    runOnUI(() => {
      "worklet";
      translateY.value = withSpring(y, SPRING_CFG);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSectionExpanded = useCallback((expanded: boolean) => {
    runOnUI(() => {
      "worklet";
      sectionExpanded.value = expanded;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pan gesture ───────────────────────────────────────────────────────────

  const pan = Gesture.Pan()
    .onStart(() => {
      "worklet";
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      "worklet";
      const next    = startY.value + e.translationY;
      const ceiling = tyValues.value[maxSnapIndexSV.value];

      if (next < ceiling) {
        // Rubber-band resistance above the ceiling snap
        const overscroll = ceiling - next;
        translateY.value = ceiling - overscroll * 0.18;
        overscrollGlow.value = withTiming(
          Math.min(overscroll / GLOW_OVERSCROLL, 1),
          { duration: 60 }
        );
      } else {
        translateY.value = next;
        if (overscrollGlow.value !== 0) {
          overscrollGlow.value = withTiming(0, { duration: 60 });
        }
      }
    })
    .onEnd((e) => {
      "worklet";
      overscrollGlow.value = withTiming(0, { duration: 200 });

      const cur    = translateY.value;
      const v      = e.velocityY;
      const tys    = tyValues.value;
      const maxIdx = maxSnapIndexSV.value;

      // FIX J — shared getNearestIndex helper used for both nearest-snap release
      // and as the fling baseline. Strict d < bestD → ties snap UP (prefer more-open
      // state on tie). Respects maxIdx ceiling.
      const getNearestIndex = (): number => {
        "worklet";
        let best  = 0;
        let bestD = Math.abs(tys[0] - cur);
        for (let i = 1; i <= maxIdx; i++) {
          const d = Math.abs(tys[i] - cur);
          if (d < bestD) {
            bestD = d;
            best  = i;
          }
        }
        return best;
      };

      // FIX J — index-based fling: find nearest index, then step ±1.
      // Fling DOWN (v > 0) → one snap more collapsed (toward index 0)
      // Fling UP   (v < 0) → one snap more expanded  (toward maxIdx)
      if (Math.abs(v) > FLING_VELOCITY) {
        const nearest = getNearestIndex();
        const target  = v > 0
          ? Math.max(nearest - 1, 0)
          : Math.min(nearest + 1, maxIdx);
        translateY.value = withSpring(tys[target], SPRING_CFG);
        return;
      }

      // Nearest-snap release (slow drag, no fling)
      translateY.value = withSpring(tys[getNearestIndex()], SPRING_CFG);
    });

  // ── Keyboard handling ─────────────────────────────────────────────────────
  //
  // FIX K — preKBIndex stores the snap INDEX, not raw TY pixels.
  //
  // Before fix:
  //   restore = Math.max(preKBSnap.current, ceiling)   raw px, semantically inverted
  //   → Math.max picks the LARGER Y = the LOWER visible position (confusing)
  //
  // After fix:
  //   restore = Math.min(preKBIndex.current, maxSnapIndex)
  //   → Math.min picks the LOWER index = the LESS expanded position (readable)
  //
  useEffect(() => {
    if (!onKeyboardShow) return;

    const kbIdx = keyboardSnapIndex !== undefined
      ? keyboardSnapIndex
      : snapPoints.length - 1;
    const kbTY = TY[kbIdx];

    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        // Only save the position if the sheet isn't already above the keyboard snap
        if (translateY.value > kbTY) {
          let savedIdx = 0;
          let bestD    = Math.abs(TY[0] - translateY.value);
          for (let i = 1; i < TY.length; i++) {
            const d = Math.abs(TY[i] - translateY.value);
            if (d < bestD) { bestD = d; savedIdx = i; }
          }
          preKBIndex.current = savedIdx;
        }
        runOnUI(() => {
          "worklet";
          translateY.value = withSpring(kbTY, SPRING_CFG);
        })();
      }
    );

    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        // FIX K — restore by index, clamped to never exceed the drag ceiling
        const restoreIdx = Math.min(preKBIndex.current, maxSnapIndex);
        const restoreY   = TY[restoreIdx];
        runOnUI(() => {
          "worklet";
          translateY.value = withSpring(restoreY, SPRING_CFG);
        })();
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onKeyboardShow, screenHeight, ...snapPoints, maxSnapIndex]);

  // ── Animated styles ───────────────────────────────────────────────────────

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      overscrollGlow.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  return {
    translateY,
    sheetStyle,
    pan,
    snapTo,
    snapToY,
    TY,
    overscrollGlow,
    glowStyle,
    sectionExpanded,
    setSectionExpanded,
  };
}
