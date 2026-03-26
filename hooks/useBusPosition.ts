import { useEffect, useRef, useState } from 'react';

import { busMuxClient, type WsBusDTO } from '@/services/ws/busMuxClient';
import type { RouteStop } from '@/services/api/stops';
import { roadPosition } from '@/utils/routeGeometry';

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
 * When routeStops are provided, the LERP target is road-snapped using
 * stopIndex + fractionalIndex so the marker stays on the road rather than
 * drifting to raw GPS coordinates.
 *
 * Usage:
 *   const { displayPos, latestBus } = useBusPosition(activeBusId, routeStops);
 */
export function useBusPosition(
  busId: string | null,
  routeStops?: RouteStop[] | null,
): {
  displayPos: DisplayPosition | null;
  latestBus: WsBusDTO | null;
} {
  const [displayPos, setDisplayPos] = useState<DisplayPosition | null>(null);
  const [latestBus, setLatestBus] = useState<WsBusDTO | null>(null);

  // Monotonic sequence guard — discard frames that arrive out of order.
  const lastSeqRef = useRef<number>(-1);

  // All interpolation state lives in a ref so the ticker closure is always
  // reading the latest values without needing to be re-created.
  const lerpRef = useRef<{
    from: DisplayPosition | null;
    to: DisplayPosition | null;
    current: DisplayPosition | null; // last value pushed to state
    startTime: number;
  }>({ from: null, to: null, current: null, startTime: 0 });

  // Keep latest routeStops in a ref so the WS callback always sees the
  // current value without needing to re-subscribe when stops load.
  const routeStopsRef = useRef<RouteStop[] | null | undefined>(routeStops);
  useEffect(() => {
    routeStopsRef.current = routeStops;
  }, [routeStops]);

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
      lastSeqRef.current = -1;
      return;
    }
    // Reset seq guard for the new bus subscription
    lastSeqRef.current = -1;

    // The server's seq counter is per-WS-connection and resets to 0 on every
    // reconnect. Reset the guard when the socket reopens so fresh frames from
    // the new connection are not silently discarded.
    const offConnect = busMuxClient.onConnect(() => {
      lastSeqRef.current = -1;
    });

    const off = busMuxClient.onBusUpdate((frame) => {
      // The mux may carry updates for other buses; filter to the one we care about.
      console.log("[useBusPosition] bus.update received — frame busId:", frame.bus.BusID, "watching:", busId);
      if (frame.bus.BusID !== busId) return;

      // Discard out-of-order frames (can arrive during reconnect replays).
      if (frame.seq <= lastSeqRef.current) return;
      lastSeqRef.current = frame.seq;

      const bus = frame.bus;
      console.log("[useBusPosition] matched — stopIndex:", bus.StopIndex, "fractional:", bus.FractionalIndex, "routeStops:", routeStopsRef.current?.length ?? "null");
      setLatestBus(bus);

      // Compute road-snapped target when route geometry is available.
      // Fall back to raw GPS if snapping returns null (e.g. first frame before stops load).
      const stops = routeStopsRef.current;
      const snapped =
        stops && stops.length >= 2
          ? roadPosition(stops, bus.StopIndex, bus.FractionalIndex)
          : null;
      const target: DisplayPosition = snapped ?? {
        lat: bus.Position.Lat,
        lon: bus.Position.Lon,
      };
      console.log("[useBusPosition] snapped:", snapped ? `${snapped.lat.toFixed(5)},${snapped.lon.toFixed(5)}` : "null (raw GPS fallback)");

      // Start a new LERP from wherever the marker is right now → snapped road position.
      const s = lerpRef.current;
      lerpRef.current = {
        // If we have a current displayed position use it; otherwise snap immediately
        // (first frame after subscription — no animation needed).
        from: s.current ?? target,
        to:   target,
        current: s.current,
        startTime: Date.now(),
      };
    });

    return () => {
      off();
      offConnect();
    };
  }, [busId]);

  return { displayPos, latestBus };
}
