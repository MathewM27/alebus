import { useEffect, useRef, useState } from 'react';

import { busMuxClient, type WsBusDTO } from '@/services/ws/busMuxClient';
import { rawPositionClient } from '@/services/ws/rawPositionClient';
import type { RouteStop } from '@/services/api/stops';
// LEGACY DISABLED: roadPosition import commented out — only segmentPct path active.
// Re-enable if restoring stopIndex+fractionalIndex fallback.
// import { roadPosition, segmentPctToPosition } from '@/utils/routeGeometry';
import { segmentPctToPosition } from '@/utils/routeGeometry';

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
  // Secondary timestamp guard — discard frames with an older device timestamp
  // (can occur when the server replays buffered frames after a reconnect).
  const lastTimestampRef = useRef<number>(-1);

  // All interpolation state lives in a ref so the ticker closure is always
  // reading the latest values without needing to be re-created.
  const lerpRef = useRef<{
    from: DisplayPosition | null;
    to: DisplayPosition | null;
    current: DisplayPosition | null; // last value pushed to state
    startTime: number;
  }>({ from: null, to: null, current: null, startTime: 0 });

  // Keep the latest processed bus frame in a ref so the routeStops effect
  // can snap the LERP when geometry first loads, without re-subscribing.
  const latestBusRef = useRef<WsBusDTO | null>(null);

  // Keep latest routeStops in a ref so the WS callback always sees the
  // current value without needing to re-subscribe when stops load.
  const routeStopsRef = useRef<RouteStop[] | null | undefined>(routeStops);
  useEffect(() => {
    routeStopsRef.current = routeStops;

    // Bug #3 fix: when routeStops loads mid-session (was null, now has data),
    // snap the LERP immediately to the road-snapped position so the marker
    // doesn't jump from the raw GPS fallback to the snapped road position.
    const bus = latestBusRef.current;
    console.log(
      `[busPos:stopsLoaded] count=${routeStops?.length ?? 0}`,
      `hasBus=${!!bus}`,
      `busSegmentPct=${bus?.SegmentPct?.toFixed(4) ?? 'n/a'}`,
    );
    if (!routeStops || routeStops.length < 2 || !bus) return;
    const snapped = segmentPctToPosition(routeStops, bus.SegmentPct);
    console.log(
      `[busPos:snapOnLoad]`,
      `segmentPct=${bus.SegmentPct.toFixed(4)}`,
      `snapped=${snapped ? `${snapped.lat.toFixed(6)},${snapped.lon.toFixed(6)}` : 'null'}`,
    );
    if (!snapped) return;
    // Snap without animation: set from === to === snapped so no LERP runs.
    lerpRef.current = {
      from: snapped,
      to: snapped,
      current: snapped,
      startTime: Date.now(),
    };
    setDisplayPos(snapped);
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
      lastTimestampRef.current = -1; // Bug #2: also reset timestamp guard on reconnect
    });

    // ── Fast-lane: raw GPS frames (~1 s cadence) ─────────────────────────────
    // Raw frames arrive before enrichment completes and keep the marker moving
    // between enriched bus.update frames. We use the raw lat/lon directly as
    // the LERP target; the next enriched frame will road-snap it to the polyline.
    const offRaw = rawPositionClient.subscribe(busId, (raw) => {
      const s = lerpRef.current;
      const target: DisplayPosition = { lat: raw.lat, lon: raw.lon };
      console.log(
        `[busPos:raw] busId=${busId} seq=${raw.seq}`,
        `lat=${raw.lat.toFixed(6)} lon=${raw.lon.toFixed(6)}`,
        `speed=${raw.speed_ms.toFixed(1)}m/s bearing=${raw.bearing}°`,
        `from=${s.current ? `${s.current.lat.toFixed(6)},${s.current.lon.toFixed(6)}` : 'null'}`,
      );
      lerpRef.current = {
        from: s.current ?? target,
        to:   target,
        current: s.current,
        startTime: Date.now(),
      };
    });

    const off = busMuxClient.onBusUpdate((frame) => {
      // The mux may carry updates for other buses; filter to the one we care about.
      if (frame.bus.BusID !== busId) return;

      // Discard out-of-order frames (can arrive during reconnect replays).
      if (frame.seq <= lastSeqRef.current) {
        console.log(`[busPos:enriched] DISCARDED out-of-order seq=${frame.seq} lastSeq=${lastSeqRef.current}`);
        return;
      }
      lastSeqRef.current = frame.seq;

      const bus = frame.bus;

      const frameTs = bus.Position.DeviceTimestampMs;
      if (frameTs > 0 && frameTs <= lastTimestampRef.current) {
        console.log(`[busPos:enriched] DISCARDED stale ts=${frameTs} lastTs=${lastTimestampRef.current}`);
        return;
      }
      if (frameTs > 0) lastTimestampRef.current = frameTs;
      latestBusRef.current = bus;
      setLatestBus(bus);

      const stops = routeStopsRef.current;
      const hasStops = stops && stops.length >= 2;
      const snapped = hasStops ? segmentPctToPosition(stops!, bus.SegmentPct) : null;
      const target: DisplayPosition = snapped ?? {
        lat: bus.Position.Lat,
        lon: bus.Position.Lon,
      };

      console.log(
        `[busPos:enriched] seq=${frame.seq}`,
        `segmentPct=${bus.SegmentPct.toFixed(4)}`,
        `stopIndex=${bus.StopIndex}`,
        `rawGPS=${bus.Position.Lat.toFixed(6)},${bus.Position.Lon.toFixed(6)}`,
        `stops=${hasStops ? stops!.length : 'NOT_LOADED'}`,
        `snapped=${snapped ? `${snapped.lat.toFixed(6)},${snapped.lon.toFixed(6)}` : 'null→rawGPS'}`,
        `target=${target.lat.toFixed(6)},${target.lon.toFixed(6)}`,
      );

      const s = lerpRef.current;
      lerpRef.current = {
        from: s.current ?? target,
        to:   target,
        current: s.current,
        startTime: Date.now(),
      };
    });

    return () => {
      off();
      offRaw();
      offConnect();
    };
  }, [busId]);

  return { displayPos, latestBus };
}
