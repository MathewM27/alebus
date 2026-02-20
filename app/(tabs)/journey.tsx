import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { useJourney } from '@/contexts/JourneyContext';
import { JourneyStatus } from '@/types/Journey';

/* ───────────── theme (reused from Home) ───────────── */
const { height: SCREEN_H } = Dimensions.get('window');
const ACCENT = '#c1ec72';
const BG = '#000000';
const SHEET_BG = '#0E0E10';
const SURFACE = '#151518';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = 'rgba(255,255,255,0.65)';
const BORDER = 'rgba(255,255,255,0.12)';

/* ── snap points (same as Home) ── */
const SNAP_LOW = 140;
const SNAP_MID = SCREEN_H * 0.50;
const SNAP_HIGH = SCREEN_H * 0.90;

const TY_HIGH = SCREEN_H - SNAP_HIGH;
const TY_MID = SCREEN_H - SNAP_MID;
const TY_LOW = SCREEN_H - SNAP_LOW;

const SPRING_CFG = { damping: 26, stiffness: 260, mass: 0.8 };

/* ── same map markers as Home ── */
const BUS_MARKERS = [
  { id: '1', lat: -20.1609, lng: 57.5012, title: 'Port Louis Terminal' },
  { id: '2', lat: -20.2309, lng: 57.4992, title: 'Quatre Bornes Stop' },
  { id: '3', lat: -20.3168, lng: 57.5225, title: 'Curepipe Central' },
  { id: '4', lat: -20.2631, lng: 57.5803, title: 'Centre de Flacq' },
  { id: '5', lat: -20.4398, lng: 57.6592, title: 'Mahebourg Station' },
  { id: '6', lat: -20.1000, lng: 57.5700, title: 'Pamplemousses' },
];

/* ── same Leaflet HTML (reused from Home) ── */
const LEAFLET_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; }
    html, body, #map { width: 100%; height: 100%; background: #aadaff; }
    .leaflet-control-attribution { display: none !important; }
    .leaflet-control-zoom { display: none !important; }
    .bus-marker {
      width: 24px; height: 24px; border-radius: 50%;
      background: ${ACCENT}; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 2px rgba(255,255,255,0.8);
      border: 2px solid #fff;
    }
    .bus-marker-inner { width: 8px; height: 8px; border-radius: 50%; background: #000; }
    .leaflet-popup-content-wrapper {
      background: #ffffff; color: #333; border-radius: 10px;
      border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .leaflet-popup-tip { background: #ffffff; }
    .leaflet-popup-content { margin: 8px 12px; font-size: 13px; font-family: system-ui; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [-20.348404, 57.552152],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, subdomains: 'abc'
    }).addTo(map);
    var markers = ${JSON.stringify(BUS_MARKERS)};
    markers.forEach(function(m) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="bus-marker"><div class="bus-marker-inner"></div></div>',
        iconSize: [24, 24], iconAnchor: [12, 12]
      });
      L.marker([m.lat, m.lng], { icon: icon }).addTo(map).bindPopup(m.title);
    });
  <\/script>
</body>
</html>
`;

/* ───────────── types & mock data ───────────── */
interface Shortcut {
  id: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  origin: string;
  destination: string;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: 'home', icon: 'home-outline', label: 'Home', origin: 'Curepipe Central', destination: 'Port Louis Terminal' },
  { id: 'work', icon: 'briefcase-outline', label: 'Work', origin: 'Port Louis Terminal', destination: 'Curepipe Central' },
  { id: 'school', icon: 'school-outline', label: 'School', origin: 'Rose Hill Hub', destination: 'Quatre Bornes' },
];

/* ───────────── sub-components ───────────── */

function ShortcutTile({
  shortcut,
  onTap,
  onEditPress,
}: {
  shortcut: Shortcut;
  onTap: () => void;
  onEditPress: () => void;
}) {
  return (
    <View style={cardStyles.tileWrapper}>
      <Pressable onPress={onTap} style={({ pressed }) => [cardStyles.tile, pressed && { opacity: 0.7 }]}>
        <MaterialCommunityIcons name={shortcut.icon} size={24} color={TEXT_PRIMARY} />
        <Text style={cardStyles.tileLabel} numberOfLines={1}>{shortcut.label}</Text>
      </Pressable>
      <Pressable onPress={onEditPress} hitSlop={8} style={cardStyles.tileEditBtn}>
        <MaterialCommunityIcons name="dots-vertical" size={14} color={TEXT_SECONDARY} />
      </Pressable>
    </View>
  );
}

function AddNewTile({ onPress }: { onPress: () => void }) {
  return (
    <View style={cardStyles.tileWrapper}>
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyles.tile, cardStyles.tileAdd, pressed && { opacity: 0.7 }]}>
        <MaterialCommunityIcons name="plus" size={24} color={ACCENT} />
        <Text style={cardStyles.tileLabel}>Add New</Text>
      </Pressable>
    </View>
  );
}

function EditCard({
  shortcut,
  editOrigin,
  editDest,
  onOriginChange,
  onDestChange,
  onSave,
  onDelete,
  onCancel,
}: {
  shortcut: Shortcut;
  editOrigin: string;
  editDest: string;
  onOriginChange: (t: string) => void;
  onDestChange: (t: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <View style={cardStyles.editCard}>
      <View style={cardStyles.editHeader}>
        <View style={cardStyles.editIconWrap}>
          <MaterialCommunityIcons name={shortcut.icon} size={20} color={ACCENT} />
        </View>
        <Text style={cardStyles.editTitle}>Edit {shortcut.label}</Text>
        <Pressable onPress={onCancel} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={20} color={TEXT_SECONDARY} />
        </Pressable>
      </View>

      <View style={cardStyles.editField}>
        <MaterialCommunityIcons name="circle-outline" size={14} color={ACCENT} style={{ marginRight: 8 }} />
        <TextInput
          style={cardStyles.editInput}
          value={editOrigin}
          onChangeText={onOriginChange}
          placeholder="Origin"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>
      <View style={cardStyles.editField}>
        <MaterialCommunityIcons name="map-marker" size={14} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
        <TextInput
          style={cardStyles.editInput}
          value={editDest}
          onChangeText={onDestChange}
          placeholder="Destination"
          placeholderTextColor="rgba(255,255,255,0.3)"
          selectionColor={ACCENT}
        />
      </View>

      <View style={cardStyles.editActions}>
        <Pressable onPress={onDelete} style={({ pressed }) => [cardStyles.deleteBtn, pressed && { opacity: 0.7 }]}>
          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#ff6b6b" />
        </Pressable>
        <Pressable onPress={onSave} style={({ pressed }) => [cardStyles.saveBtn, pressed && { opacity: 0.8 }]}>
          <Text style={cardStyles.saveBtnText}>Save</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ─────────────────────────────────────────────────
   JourneyScreen
   ───────────────────────────────────────────────── */

export default function JourneyScreen() {
  const insets = useSafeAreaInsets();
  const { activeJourney } = useJourney();

  /* ── Shortcuts state ── */
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(DEFAULT_SHORTCUTS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editOrigin, setEditOrigin] = useState('');
  const [editDest, setEditDest] = useState('');

  /* ── "Add new" mode ── */
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDest, setNewDest] = useState('');

  /* ── shared values (same pattern as Home) ── */
  const translateY = useSharedValue(TY_LOW);
  const ctx = useSharedValue(0);

  const snapTo = useCallback((target: number) => {
    'worklet';
    translateY.value = withSpring(target, SPRING_CFG);
  }, []);

  /* ── Pan gesture ── */
  const pan = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      ctx.value = translateY.value;
    })
    .onUpdate((e) => {
      translateY.value = Math.max(TY_HIGH, Math.min(ctx.value + e.translationY, TY_LOW));
    })
    .onEnd((e) => {
      const cur = translateY.value;
      const v = e.velocityY;
      const FLING = 600;

      if (Math.abs(v) > FLING) {
        if (v > 0) {
          snapTo(cur < TY_MID ? TY_MID : TY_LOW);
        } else {
          snapTo(cur > TY_MID ? TY_MID : TY_HIGH);
        }
        return;
      }

      const snaps = [TY_HIGH, TY_MID, TY_LOW];
      let best = snaps[0];
      let bestD = Math.abs(cur - snaps[0]);
      for (const snap of snaps) {
        const d = Math.abs(cur - snap);
        if (d < bestD) { bestD = d; best = snap; }
      }
      snapTo(best);
    });

  /* ── Animated styles ── */
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateY.value,
      [TY_MID, TY_LOW],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  /* ── Handlers ── */
  const handleStartJourney = (sc: Shortcut) => {
    console.log('Start journey:', { from: sc.origin, to: sc.destination });
    // TODO: Navigate to Home with prefilled origin/destination or call startJourney
  };

  const handleEditToggle = (sc: Shortcut) => {
    if (editingId === sc.id) {
      setEditingId(null);
    } else {
      setEditingId(sc.id);
      setEditOrigin(sc.origin);
      setEditDest(sc.destination);
      translateY.value = withSpring(TY_MID, SPRING_CFG);
    }
  };

  const handleSaveEdit = (id: string) => {
    setShortcuts((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, origin: editOrigin, destination: editDest } : s,
      ),
    );
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setShortcuts((prev) => prev.filter((s) => s.id !== id));
    setEditingId(null);
  };

  const handleAddNew = () => {
    setAdding(true);
    setNewLabel('');
    setNewOrigin('');
    setNewDest('');
    translateY.value = withSpring(TY_MID, SPRING_CFG);
  };

  const handleSaveNew = () => {
    if (!newLabel.trim() || !newOrigin.trim() || !newDest.trim()) return;
    const newSc: Shortcut = {
      id: Date.now().toString(),
      icon: 'map-marker-path',
      label: newLabel.trim(),
      origin: newOrigin.trim(),
      destination: newDest.trim(),
    };
    setShortcuts((prev) => [...prev, newSc]);
    setAdding(false);
  };

  const handleCancelAdd = () => {
    setAdding(false);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar style="light" />

      {/* Map */}
      <WebView
        source={{ html: LEAFLET_HTML }}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        renderLoading={() => <View style={styles.mapLoading} />}
      />
      <View style={styles.mapOverlay} pointerEvents="none" />

      {/* ── Bottom Sheet ── */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.sheetOuter, sheetStyle]}>
          {/* Handle */}
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>

          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Journeys</Text>
            </View>
            <Text style={styles.headerSubtitle}>Your saved shortcuts</Text>
          </View>

          {/* Expanded content */}
          <Animated.View style={[styles.expandedWrap, expandedOpacity]}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Shortcut Tiles Grid ── */}
            <Text style={styles.sectionLabel}>Shortcuts</Text>
            <View style={cardStyles.tilesGrid}>
              {shortcuts.map((sc) => (
                <ShortcutTile
                  key={sc.id}
                  shortcut={sc}
                  onTap={() => handleStartJourney(sc)}
                  onEditPress={() => handleEditToggle(sc)}
                />
              ))}
              <AddNewTile onPress={handleAddNew} />
            </View>

            {/* ── Edit Card (appears when editing) ── */}
            {editingId && (
              <EditCard
                shortcut={shortcuts.find((s) => s.id === editingId)!}
                editOrigin={editOrigin}
                editDest={editDest}
                onOriginChange={setEditOrigin}
                onDestChange={setEditDest}
                onSave={() => handleSaveEdit(editingId)}
                onDelete={() => handleDelete(editingId)}
                onCancel={() => setEditingId(null)}
              />
            )}

            {/* ── Add New Form (appears when adding) ── */}
            {adding && (
              <View style={cardStyles.editCard}>
                <View style={cardStyles.editHeader}>
                  <View style={cardStyles.editIconWrap}>
                    <MaterialCommunityIcons name="plus" size={20} color={ACCENT} />
                  </View>
                  <Text style={cardStyles.editTitle}>New Shortcut</Text>
                  <Pressable onPress={handleCancelAdd} hitSlop={8}>
                    <MaterialCommunityIcons name="close" size={20} color={TEXT_SECONDARY} />
                  </Pressable>
                </View>

                <View style={cardStyles.editField}>
                  <MaterialCommunityIcons name="label-outline" size={14} color={ACCENT} style={{ marginRight: 8 }} />
                  <TextInput
                    style={cardStyles.editInput}
                    value={newLabel}
                    onChangeText={setNewLabel}
                    placeholder="Label (e.g. Gym)"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    selectionColor={ACCENT}
                  />
                </View>
                <View style={cardStyles.editField}>
                  <MaterialCommunityIcons name="circle-outline" size={14} color={ACCENT} style={{ marginRight: 8 }} />
                  <TextInput
                    style={cardStyles.editInput}
                    value={newOrigin}
                    onChangeText={setNewOrigin}
                    placeholder="Origin"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    selectionColor={ACCENT}
                  />
                </View>
                <View style={cardStyles.editField}>
                  <MaterialCommunityIcons name="map-marker" size={14} color={TEXT_SECONDARY} style={{ marginRight: 8 }} />
                  <TextInput
                    style={cardStyles.editInput}
                    value={newDest}
                    onChangeText={setNewDest}
                    placeholder="Destination"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    selectionColor={ACCENT}
                  />
                </View>

                <Pressable
                  onPress={handleSaveNew}
                  style={({ pressed }) => [
                    cardStyles.saveBtn,
                    { marginTop: 12 },
                    (!newLabel.trim() || !newOrigin.trim() || !newDest.trim()) && { opacity: 0.4 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={cardStyles.saveBtnText}>Save Shortcut</Text>
                </Pressable>
              </View>
            )}

            {/* ── Active Journey ── */}
            {activeJourney && activeJourney.status !== JourneyStatus.Completed && activeJourney.status !== JourneyStatus.Cancelled ? (
              <Pressable
                style={({ pressed }) => [cardStyles.activeCard, pressed && { opacity: 0.9 }]}
                onPress={() => console.log('Resume tracking')}
              >
                <View style={cardStyles.activeHeader}>
                  <View style={cardStyles.activePill}>
                    <View style={cardStyles.activeDot} />
                    <Text style={cardStyles.activePillText}>Active Journey</Text>
                  </View>
                </View>
                <Text style={cardStyles.activeRoute}>
                  {activeJourney.origin.name} → {activeJourney.destination.name}
                </Text>
                <Text style={cardStyles.activeEta}>Next bus ETA: ~8 min</Text>
                <View style={cardStyles.resumeBtn}>
                  <MaterialCommunityIcons name="navigation-variant" size={16} color={BG} style={{ marginRight: 6 }} />
                  <Text style={cardStyles.resumeBtnText}>Resume tracking</Text>
                </View>
              </Pressable>
            ) : (
              <View style={cardStyles.inactiveCard}>
                <MaterialCommunityIcons name="bus-clock" size={20} color={TEXT_SECONDARY} />
                <Text style={cardStyles.inactiveText}>No active journey</Text>
              </View>
            )}
          </ScrollView>
        </Animated.View>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

/* ───────────── styles ───────────── */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.03)' },
  mapLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: '#aadaff' },

  sheetOuter: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: SCREEN_H,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  handleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  /* Header */
  headerWrap: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 8, alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  headerSubtitle: { color: TEXT_SECONDARY, fontSize: 13, marginTop: 2, textAlign: 'center' },

  expandedWrap: { flex: 1, marginTop: 8 },

  /* Section labels */
  sectionLabel: {
    color: TEXT_SECONDARY, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
  },
});

/* ── card styles ── */
const cardStyles = StyleSheet.create({
  /* Tiles Grid */
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
    columnGap: 10,
    marginBottom: 20,
  },
  tileWrapper: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '22%', // ~4 per row with gaps, but will expand to fill
    minWidth: 70,
    position: 'relative',
  },
  tile: {
    aspectRatio: 1,
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  tileAdd: {
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tileLabel: {
    color: TEXT_SECONDARY,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  tileEditBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
  },

  /* Edit Card */
  editCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 18,
    marginBottom: 20,
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  editIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(193,236,114,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  editTitle: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  editField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  editInput: {
    flex: 1,
    color: TEXT_PRIMARY,
    fontSize: 14,
    padding: 0,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: ACCENT,
    borderRadius: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: BG, fontSize: 14, fontWeight: '600' },

  /* Active journey card */
  activeCard: {
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 18,
    marginTop: 16,
  },
  activeHeader: { flexDirection: 'row', marginBottom: 10 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(193,236,114,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 6,
  },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  activePillText: { color: ACCENT, fontSize: 12, fontWeight: '600' },
  activeRoute: { color: TEXT_PRIMARY, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  activeEta: { color: TEXT_SECONDARY, fontSize: 13, marginBottom: 14 },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderRadius: 14,
    height: 44,
  },
  resumeBtnText: { color: BG, fontSize: 15, fontWeight: '600' },

  /* Inactive journey placeholder */
  inactiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SURFACE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 18,
    marginTop: 16,
    gap: 8,
  },
  inactiveText: { color: TEXT_SECONDARY, fontSize: 14 },
});
