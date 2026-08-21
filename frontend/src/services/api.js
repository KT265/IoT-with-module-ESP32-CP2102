const hostname = window.location.hostname || 'localhost';
const API_BASE = `http://${hostname}:8000`;

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
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${hostname}:8000/ws`;
    const ws = new WebSocket(wsUrl);
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