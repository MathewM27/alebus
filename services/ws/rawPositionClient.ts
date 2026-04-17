import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/services/api/client';

function getRawPositionUrl(token: string): string {
  const wsBase = API_BASE_URL.replace(/^http/, 'ws');
  return `${wsBase}/ws/raw-position?token=${encodeURIComponent(token)}`;
}

// Frame shape from backend ws_raw_position.go (snake_case json tags).
export interface RawPositionFrame {
  seq:      number;
  bus_id:   string;
  lat:      number;
  lon:      number;
  ts_ms:    number;
  speed_ms: number;
  bearing:  number;
}

type RawPositionHandler = (frame: RawPositionFrame) => void;

// Per-bus subscriber set: busId → set of handlers.
// An empty string key "" means "all buses" (wildcard).
type BusSubscribers = Map<string, Set<RawPositionHandler>>;

class RawPositionClient {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private intentionalClose = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1_000;

  private subscribers: BusSubscribers = new Map();

  // Subscribe to raw frames for a specific busId.
  // Returns an unsubscribe function.
  subscribe(busId: string, handler: RawPositionHandler): () => void {
    if (!this.subscribers.has(busId)) {
      this.subscribers.set(busId, new Set());
    }
    this.subscribers.get(busId)!.add(handler);

    // Lazily connect on first subscriber.
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this._connect();
    }

    return () => {
      const set = this.subscribers.get(busId);
      if (set) {
        set.delete(handler);
        if (set.size === 0) this.subscribers.delete(busId);
      }
      // Disconnect when no subscribers remain.
      if (this.subscribers.size === 0) {
        this.intentionalClose = true;
        this._clearReconnect();
        this.ws?.close();
        this.ws = null;
      }
    };
  }

  // ---------- Private ----------

  private async _connect(): Promise<void> {
    const { data } = await supabase.auth.getSession();
    this.token = data.session?.access_token ?? null;
    if (!this.token) return;

    this.intentionalClose = false;
    this._openSocket();
  }

  private _openSocket(): void {
    if (!this.token) return;

    const ws = new WebSocket(getRawPositionUrl(this.token));
    this.ws = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data as string) as { type: string; data: RawPositionFrame };
        if (msg.type === 'raw_position') {
          this._dispatch(msg.data);
        }
      } catch {
        // ignore malformed frames
      }
    };

    ws.onclose = (evt) => {
      console.log('[rawPosition] socket closed — code:', evt.code);
      if (!this.intentionalClose && this.subscribers.size > 0) {
        this._scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // onclose fires after onerror — reconnect handled there
    };
  }

  private _dispatch(frame: RawPositionFrame): void {
    // Notify handlers subscribed to this specific bus.
    const busSet = this.subscribers.get(frame.bus_id);
    busSet?.forEach(h => h(frame));

    // Notify wildcard subscribers.
    const allSet = this.subscribers.get('');
    allSet?.forEach(h => h(frame));
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
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

// App-level singleton.
export const rawPositionClient = new RawPositionClient();
