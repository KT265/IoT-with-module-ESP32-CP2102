// Link backend online vừa deploy trên Render
const PRODUCTION_BACKEND = "https://agrologic.onrender.com"; 

const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

const API_BASE = isLocalhost ? `http://${window.location.hostname}:8000` : PRODUCTION_BACKEND;
const WS_BASE = isLocalhost 
  ? `ws://${window.location.hostname}:8000/ws` 
  : PRODUCTION_BACKEND.replace("https://", "wss://").replace("http://", "ws://") + "/ws";

export const api = {
  getSettings: async () => {
    const res = await fetch(`${API_BASE}/api/settings`);
    return res.json();
  },
  saveSettings: async (cfg) => {
    const res = await fetch(`${API_BASE}/api/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cfg)
    });
    return res.json();
  },
  getAnalytics: async () => {
    const res = await fetch(`${API_BASE}/api/analytics`);
    return res.json();
  },
  getForecast: async () => {
    const res = await fetch(`${API_BASE}/api/forecast`);
    return res.json();
  },
  sendControl: async (cmd) => {
    const res = await fetch(`${API_BASE}/api/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cmd)
    });
    return res.json();
  },
  runAiAnalyze: async () => {
    const res = await fetch(`${API_BASE}/api/ai-analyze`, { method: "POST" });
    return res.json();
  },
  connectWebSocket: (onMessage) => {
    const ws = new WebSocket(WS_BASE);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.error("WS error", e);
      }
    };
    return ws;
  }
};