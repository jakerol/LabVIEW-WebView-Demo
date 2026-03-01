export type TagValue =
  | number
  | string
  | boolean
  | number[]
  | Record<string, unknown>
  | null;
  
interface LabVIEWUpdatePayload {
  tag: string;
  value: TagValue;
}

declare global {
  interface Window {
    LabVIEW?: {
      FireUserEvent: (refnum: number, data: string) => void;
    };
    labviewBridge: ControlStackBridge;
  }
}

class ControlStackBridge {
  private refnum: number | null = null;
  public store = new Map<string, TagValue>();
  private subscribers = new Map<string, Set<(value: TagValue) => void>>();
  public setRefnum(args: number | string | { refnum: number }) {
    let refnum: number | null = null;
    try {
      if (typeof args === "number") {
        refnum = args;
      } else if (typeof args === "string") {
        const trimmed = args.trim();
        if (trimmed.startsWith("{")) {
          const parsed = JSON.parse(trimmed);
          refnum = typeof parsed?.refnum === "number" ? parsed.refnum : null;
        } else {
          const n = Number(trimmed);
          refnum = Number.isFinite(n) ? n : null;
        }
      } else if (args && typeof args === "object") {
        refnum = typeof args.refnum === "number" ? args.refnum : null;
      }
    } catch (e) {
      console.warn("[CS-WebBridge] setRefnum: error parsing args:", e);
      refnum = null;
      }

    if (refnum === null) {
      console.warn("[CS-WebBridge] setRefnum: invalid args:", args);
      return "ERROR invalid refnum";
    }

  this.refnum = refnum;
  return `OK refnum=${refnum}`;
}
public isConnected(): boolean {
  return this.refnum !== null && !!window.LabVIEW?.FireUserEvent;
}
 // Method to receive updates from LabVIEW
  public updateState(payload: string | LabVIEWUpdatePayload) {
    const data =
      typeof payload === "string" ? JSON.parse(payload) : payload;

    const { tag, value } = data;

    this.store.set(tag, value); // save the latest value for this tag in store

    if (this.subscribers.has(tag)) {
      this.subscribers.get(tag)!.forEach((cb) => cb(value));
    }
  }

  public subscribe(tag: string, callback: (value: TagValue) => void) {
    if (!this.subscribers.has(tag)) {
      this.subscribers.set(tag, new Set());
    }

    this.subscribers.get(tag)!.add(callback);

    if (this.store.has(tag)) {
      callback(this.store.get(tag)!);
    }

    return () => {
      this.subscribers.get(tag)?.delete(callback);
    };
  }

public sendToLabVIEW(tag: string, data: any) {
  const payload = { tag, data };
  const jsonString = JSON.stringify(payload);

  // 1) Embedded LabVIEW WebView2 path
  if (this.refnum !== null && window.LabVIEW?.FireUserEvent) {
    window.LabVIEW.FireUserEvent(this.refnum, jsonString);
    return;
  }

  // 2) Chrome / external browser path via WebSocket
  if (this.ws && this.ws.readyState === WebSocket.OPEN) {
    this.ws.send(jsonString);
    return;
  }

  console.warn("[CS-WebBridge] No route to LabVIEW (no FireUserEvent and WebSocket not connected).");
}

private ws: WebSocket | null = null;
private wsUrl: string | null = null;

public connectWebSocket(url = "ws://127.0.0.1:8081") {
  this.wsUrl = url;

  // Avoid reconnect spam
  if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
    return;
  }

  this.ws = new WebSocket(url);

  this.ws.onopen = () => console.log("[CS-WebBridge] WebSocket connected:", url);

  this.ws.onmessage = (ev) => {
    // Expect LabVIEW -> Web messages like {"tag":"X","value":...}
    try {
      const msg = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
      if (msg?.tag !== undefined && msg?.value !== undefined) {
        this.updateState(msg);
      } else {
        console.warn("[CS-WebBridge] WS message missing tag/value:", msg);
      }
    } catch (e) {
      console.warn("[CS-WebBridge] WS message parse error:", e);
    }
  };

  this.ws.onclose = () => {
    console.warn("[CS-WebBridge] WebSocket closed");
    // Optional: auto-reconnect
    setTimeout(() => this.wsUrl && this.connectWebSocket(this.wsUrl), 1000);
  };

  this.ws.onerror = (e) => console.warn("[CS-WebBridge] WebSocket error:", e);
}

}

const bridge = new ControlStackBridge();
window.labviewBridge = bridge;
export default bridge;