import { useEffect, useState } from "react";
import bridge from "./lib/bridge";
import  { NumericSlider} from "./components/NumericSlider";
import { useLabVIEW } from "./lib/useLabVIEW";
import "./App.css";

if (!((window as any).LabVIEW?.FireUserEvent)) {
  bridge.connectWebSocket("ws://127.0.0.1:8081");
}

export default function App() {
  // subscribe to a LabVIEW tag "Slide" with an initial value of 50
  const [value, setValue] = useLabVIEW<number>("Slide", 50);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setConnected((bridge as any).isConnected?.() ?? false);
    const t = setInterval(() => {
      setConnected((bridge as any).isConnected?.() ?? false);
    }, 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <div>
        Status: <b>{connected ? "Connected" : "Not connected"}</b>
      </div>

      <h2>Slide</h2>

      <NumericSlider
        value={value}
        min={0}
        max={100}
        onChange={(v) => setValue(v)}
      />

      <div style={{ marginTop: 20, fontSize: 24 }}>Value: {value}</div>
    </div>
  );
}