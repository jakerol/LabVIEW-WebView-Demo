import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",   // force IPv4 loopback
    port: 5173,
    strictPort: true,

    // Make HMR websocket explicit (helps some embedded WebView2 hosts)
    hmr: {
      protocol: "ws",
      host: "127.0.0.1",
      port: 5173,
    },
  },
});