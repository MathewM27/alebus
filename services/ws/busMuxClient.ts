import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/services/api/client';
import type { JourneyTrackingDTO } from '@/types/JourneyTracking';

// Derive ws:// or wss:// from the HTTP base URL
function getWsMuxUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}/ws/mux?token=${encodeURIComponent(token)}`;
}

// ---------- Wire types from actual backend ws_mux.go ----------

// BusDTO is marshaled directly by the backend with no json tags → PascalCase keys
export interface WsBusPosition {
  Lat: number;
  Lon: number;
  Timestamp: number;   // unix milliseconds
  Accuracy: number;
  SpeedKmh: number;
  OrderingTimestampMs: number;
  DeviceTimestampMs: number;
  ReceivedAtMs: number;
}

export interface WsBusDTO {
  BusID: string;
  OperatorID: string;
  RouteID: string;
  Direction: number;   // 0 = outbound, 1 = inbound
  StopIndex: number;
  Status: number;      // 0 = active, 1 = offline, 2 = maintenance
  IsAtTerminal: boolean;
  TerminalArrivalTime: string;
  Position: WsBusPosition;
  UpdatedAt: string;
  FractionalIndex: number;  // 0.0–1.0 within current segment
  Heading: number;          // compass bearing 0–360
}

// wsMuxBusUpdateEvent data shape (has json tags in Go)
export interface BusUpdateFrame {
  subId: string;
  serverTs: string;
  seq: number;
  bus: WsBusDTO;
}

// wsMuxJourneyUpdateEvent data shape (has json tags in Go)
export interface JourneyUpdateFrame {
  subId: string;
  serverTs: string;
  seq: number;
  journey: JourneyTrackingDTO;
}

// wsMuxSubscribedEvent data shape
interface SubscribedData {
  serverTs: string;
  subId: string;
  stream: string;
}

// wsMuxErrorEvent data shape
interface ErrorData {
  serverTs: string;
  code: string;
  message: string;
  subId?: string;
}

type ServerFrame =
  | { type: 'ready';          data: { serverTs: string; stream: string } }
  | { type: 'subscribed';     data: SubscribedData }
  | { type: 'unsubscribed';   data: { serverTs: string; subId: string } }
  | { type: 'bus.update';     data: BusUpdateFrame }
  | { type: 'journey.update'; data: JourneyUpdateFrame }
  | { type: 'error';          data: ErrorData };

// ---------- Handler types ----------

export type BusUpdateHandler     = (frame: BusUpdateFrame) => void;
export type JourneyUpdateHandler = (frame: JourneyUpdateFrame) => void;
export type ConnectHandler       = () => void;
export type DisconnectHandler    = () => void;

// ---------- Pending subscription ----------

interface PendingSub {
  resolve: (subId: string) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

// ---------- BusMuxClient ----------

export class BusMuxClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1_000;
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  // Active subscriptions keyed by stream name — re-sent on reconnect
  private activeSubs = new Map<string, object>();
  // Pending subscribe acks keyed by stream name
  private pendingSubs = new Map<string, PendingSub>();

  private busHandlers     = new Set<BusUpdateHandler>();
  private journeyHandlers = new Set<JourneyUpdateHandler>();
  private connectHandlers = new Set<ConnectHandler>();
  private disconnectHandlers = new Set<DisconnectHandler>();

  async connect(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this.token = data.session?.access_token ?? null;
    if (!this.token) throw new Error('BusMuxClient: no auth token');
    this.intentionalClose = false;
    this._openSocket();
  }

  disconnect(): void {
    this.intentionalClose = true;
    this._clearReconnect();
    this._stopPing();
    this.ws?.close();
    this.ws = null;
  }

  // Subscribe to a specific journey's updates.
  // Returns the subId assigned by the server (or a placeholder if not yet connected).
  subscribeJourney(journeyId: string): Promise<string> {
    const frame = { type: 'subscribe', data: { stream: 'journeys', journeyId } };
    return this._subscribe('journeys', frame);
  }

  // Subscribe to live position updates for specific bus IDs.
  subscribeLiveBuses(busIds: string[]): Promise<string> {
    const frame = { type: 'subscribe', data: { stream: 'live-buses', busIds } };
    return this._subscribe('live-buses', frame);
  }

  unsubscribe(subId: string): void {
    // Drop from active subs so it isn't re-sent on reconnect
    for (const key of this.activeSubs.keys()) {
      if (subId.startsWith(key)) {
        this.activeSubs.delete(key);
        break;
      }
    }
    this._send({ type: 'unsubscribe', data: { subId } });
  }

  onBusUpdate(handler: BusUpdateHandler): () => void {
    this.busHandlers.add(handler);
    return () => this.busHandlers.delete(handler);
  }

  onJourneyUpdate(handler: JourneyUpdateHandler): () => void {
    this.journeyHandlers.add(handler);
    return () => this.journeyHandlers.delete(handler);
  }

  onConnect(handler: ConnectHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: DisconnectHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ---------- Private ----------

  private _openSocket(): void {
    if (!this.token) return;

    const ws = new WebSocket(getWsMuxUrl(this.token));
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 1_000;
      this._startPing();
      // Re-subscribe all active subscriptions after reconnect
      for (const frame of this.activeSubs.values()) {
        ws.send(JSON.stringify(frame));
      }
      this.connectHandlers.forEach(h => h());
    };

    ws.onmessage = (evt) => {
      try {
        const frame = JSON.parse(evt.data as string) as ServerFrame;
        this._handleFrame(frame);
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = () => {
      this._stopPing();
      this.disconnectHandlers.forEach(h => h());
      if (!this.intentionalClose) {
        this._scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose fires after onerror — reconnect handled there
    };
  }

  private _handleFrame(frame: ServerFrame): void {
    switch (frame.type) {
      case 'subscribed': {
        const pending = this.pendingSubs.get(frame.data.stream);
        if (pending) {
          clearTimeout(pending.timeoutId);
          this.pendingSubs.delete(frame.data.stream);
          pending.resolve(frame.data.subId);
        }
        break;
      }
      case 'bus.update':
        this.busHandlers.forEach(h => h(frame.data));
        break;
      case 'journey.update':
        this.journeyHandlers.forEach(h => h(frame.data));
        break;
      case 'error':
        console.warn('[BusMuxClient] server error:', frame.data.code, frame.data.message);
        break;
    }
  }

  private _subscribe(stream: string, frame: object): Promise<string> {
    this.activeSubs.set(stream, frame);

    return new Promise((resolve) => {
      if (!this.isConnected) {
        // Will be sent on connect; resolve with placeholder
        resolve(`${stream}:pending`);
        return;
      }

      const timeoutId = setTimeout(() => {
        this.pendingSubs.delete(stream);
        resolve(`${stream}:timeout`);
      }, 5_000);

      this.pendingSubs.set(stream, { resolve, timeoutId });
      this._send(frame);
    });
  }

  private _send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private _startPing(): void {
    this._stopPing();
    this.pingTimer = setInterval(() => {
      this._send({ type: 'ping' });
    }, 30_000);
  }

  private _stopPing(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      // Refresh token before reconnecting
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        this.token = data.session.access_token;
      }
      this._openSocket();
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
    }, this.reconnectDelay);
  }

  private _clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// App-level singleton
export const busMuxClient = new BusMuxClient();
