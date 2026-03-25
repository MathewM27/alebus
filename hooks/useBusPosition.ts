import { useEffect, useRef, useState } from 'react';

import { busMuxClient, type WsBusDTO } from '@/services/ws/busMuxClient';

// Interpolation window in ms — covers roughly one GPS publish cycle (~2–3 s).
// Keeping it at 3 s means the marker always has somewhere to move to, producing
// continuous fluid motion even when GPS frames arrive slightly late.
const LERP_MS = 3_000;

// Render tick rate. 20 fps is smooth enough for a map marker and avoids
// flooding the React/JS bridge at 60 fps.
const TICK_MS = 50;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3); // cubic ease-out
}

export interface DisplayPosition {
  lat: number;
  lon: number;
}

/**
 * Subscribes to real-time bus position updates via the WS mux and returns
 * a smoothly interpolated display position (LERP at 20 fps) plus the latest
 * raw bus data for metadata (stopIndex, routeId, etc.).
 *
 * Usage:
 *   const { displayPos, latestBus } = useBusPosition(activeBusId);
 */
export function useBusPosition(busId: string | null): {
  displayPos: DisplayPosition | null;
  latestBus: WsBusDTO | null;
} {
  const [displayPos, setDisplayPos] = useState<DisplayPosition | null>(null);
  const [latestBus, setLatestBus] = useState<WsBusDTO | null>(null);

  // All interpolation state lives in a ref so the ticker closure is always
  // reading the latest values without needing to be re-created.
  const lerpRef = useRef<{
    from: DisplayPosition | null;
    to: DisplayPosition | null;
    current: DisplayPosition | null; // last value pushed to state
    startTime: number;
  }>({ from: null, to: null, current: null, startTime: 0 });

  // ── Interpolation ticker ──────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      const s = lerpRef.current;
      if (!s.from || !s.to) return;

      const elapsed = Date.now() - s.startTime;
      const t = Math.min(elapsed / LERP_MS, 1);
      const ease = easeOut(t);

      const lat = s.from.lat + (s.to.lat - s.from.lat) * ease;
      const lon = s.from.lon + (s.to.lon - s.from.lon) * ease;

      s.current = { lat, lon };
      setDisplayPos({ lat, lon });
    }, TICK_MS);

    return () => clearInterval(id);
  }, []); // runs once for the lifetime of the hook

  // ── WS subscription ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!busId) {
      // Clear everything when there's no active bus
      setLatestBus(null);
      setDisplayPos(null);
      lerpRef.current = { from: null, to: null, current: null, startTime: 0 };
      return;
    }

    const off = busMuxClient.onBusUpdate((frame) => {
      // The mux may carry updates for other buses; filter to the one we care about.
      if (frame.bus.BusID !== busId) return;

      const bus = frame.bus;
      setLatestBus(bus);

      // Start a new LERP from wherever the marker is right now → new GPS fix.
      const s = lerpRef.current;
      lerpRef.current = {
        // If we have a current displayed position use it; otherwise snap to the
        // raw GPS immediately (first frame after subscription).
        from: s.current ?? { lat: bus.Position.Lat, lon: bus.Position.Lon },
        to: { lat: bus.Position.Lat, lon: bus.Position.Lon },
        current: s.current,
        startTime: Date.now(),
      };
    });

    return off;
  }, [busId]);

  return { displayPos, latestBus };
}
