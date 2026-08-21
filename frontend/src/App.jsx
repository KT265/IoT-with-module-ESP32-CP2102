import React, { useState, useEffect } from 'react';
import { api } from './services/api';

import Sidebar from './components/layout/Sidebar';
import { MobileHeader } from './components/layout/MobileHeader';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import AlertToast from './components/layout/AlertToast';

import SensorCard from './components/dashboard/SensorCard';
import AiControlCard from './components/dashboard/AiControlCard';
import PumpStationCard from './components/dashboard/PumpStationCard';

import MetricChart from './components/analytics/MetricChart';
import ForecastTable from './components/analytics/ForecastTable';

import ConnectionSettings from './components/settings/ConnectionSettings';
import FarmProfileSettings from './components/settings/FarmProfileSettings';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [telemetry, setTelemetry] = useState({ temp: 0, humid: 0, soil: 0, light: 0, pump: 0 });
  const [settingsForm, setSettingsForm] = useState({});
  const [analyticsData, setAnalyticsData] = useState({ labels: [], temp: [], humid: [], soil: [] });
  const [forecastList, setForecastList] = useState([]);
  const [aiDecision, setAiDecision] = useState(null);
  const [systemMode, setSystemMode] = useState('auto');
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4000);
  };

  const loadData = () => {
    api.getAnalytics().then((data) => {
      if (data) setAnalyticsData(data);
    });
    api.getForecast().then((res) => {
      if (res && res.data) setForecastList(res.data);
    });
  };

  useEffect(() => {
    api.getSettings().then((cfg) => setSettingsForm(cfg || {}));
    loadData();

    // Polling cảm biến realtime mỗi 2 giây
    const pollInterval = setInterval(() => {
      fetch(`http://${window.location.hostname || 'localhost'}:8000/api/telemetry`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.temp !== undefined) setTelemetry(data);
        })
        .catch(() => {});
    }, 2000);

    // Cập nhật biểu đồ Analytics & Dự báo thời tiết mỗi 30 giây
    const analyticsInterval = setInterval(loadData, 30000);

    const ws = api.connectWebSocket((msg) => {
      if (msg.type === 'telemetry' || msg.type === 'init') {
        const data = msg.data || msg.telemetry;
        if (data) setTelemetry(data);
      }
    });

    return () => {
      clearInterval(pollInterval);
      clearInterval(analyticsInterval);
      if (ws) ws.close();
    };
  }, []);

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.saveSettings(settingsForm);
      triggerToast('Đã lưu cấu hình và cập nhật dự báo thời tiết!');
      loadData();
      setTimeout(() => setActiveTab('dashboard'), 800);
    } catch (err) {
      triggerToast('Lỗi lưu cài đặt: ' + err.message, 'error');
    }
  };

  const handleTriggerAi = async () => {
    triggerToast('AI đang phân tích vi khí hậu & dự báo 7 ngày...');
    try {
      const res = await api.runAiAnalyze();
      if (res.status === 'success') {
        setAiDecision(res.decision);
        triggerToast('✅ AI đã phân tích và đồng bộ xuống ESP32!');
      } else {
        triggerToast(res.message, 'error');
      }
    } catch (err) {
      triggerToast('Lỗi AI: ' + err.message, 'error');
    }
  };

  const handleToggleMode = async () => {
    const newMode = systemMode === 'auto' ? 'manual' : 'auto';
    setSystemMode(newMode);
    await api.sendControl({ mode: newMode });
    triggerToast(`Đã chuyển sang chế độ ${newMode.toUpperCase()}`);
  };

  const handleTogglePump = async (isChecked) => {
    if (systemMode === 'auto') {
      triggerToast('Vui lòng chuyển sang Manual Mode trước khi bấm công tắc!', 'error');
      return;
    }
    await api.sendControl({ mode: 'manual', manual_relay: isChecked ? 1 : 0 });
    setTelemetry((prev) => ({ ...prev, pump: isChecked ? 1 : 0 }));
    triggerToast(`Đã gửi lệnh ${isChecked ? 'BẬT' : 'TẮT'} bơm.`);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased bg-background text-on-background">
      <AlertToast alert={alert} onClose={() => setAlert({ ...alert, show: false })} />
      <MobileHeader onTriggerAi={handleTriggerAi} />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} deviceId={settingsForm.device_id} />

      <main className="flex-1 px-4 md:px-10 py-6 md:py-8 mt-16 md:mt-0 max-w-[1440px] mx-auto w-full overflow-y-auto pb-20 md:pb-8">
        
        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <section className="space-y-6">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Field Overview</h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Khu vực: {settingsForm.local_area || 'Zone Alpha'}. Hệ thống đang hoạt động.
                </p>
              </div>
              <button
                onClick={handleTriggerAi}
                className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">psychology</span>
                <span>AI Tối Ưu Nông Trại</span>
              </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SensorCard type="temp" value={telemetry.temp?.toFixed(1) || 0} targetText="Target: 24°C - 30°C" />
              <SensorCard type="humid" value={telemetry.humid?.toFixed(0) || 0} />
              <SensorCard type="soil" value={telemetry.soil || 0} isHighlight targetText={telemetry.soil < 45 ? 'Đất đang khô - cần bù ẩm' : 'Độ ẩm đất lý tưởng'} />
              <SensorCard type="light" value={telemetry.light} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AiControlCard aiDecision={aiDecision} aiModel={settingsForm.ai_model} onTriggerAi={handleTriggerAi} soilValue={telemetry.soil || 0} />
              <PumpStationCard isPumpOn={telemetry.pump === 1} systemMode={systemMode} onToggleMode={handleToggleMode} onTogglePump={handleTogglePump} />
            </div>
          </section>
        )}

        {/* VIEW 2: ANALYTICS & FORECAST */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Analytics & Forecast</h2>
                <p className="text-sm text-on-surface-variant mt-1">Biểu đồ cảm biến 24h trong ngày (lấy mẫu 5 phút/lần - tự reset lúc 00:00) & Dự báo OpenWeatherMap.</p>
              </div>
              <button onClick={loadData} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-medium hover:opacity-90 flex items-center gap-2 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">sync</span>
                <span>Làm Mới</span>
              </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MetricChart title="Air Temperature" value={`${telemetry.temp?.toFixed(1)}°C`} trend="Realtime" icon="thermostat" color="#0f5238" dataPoints={analyticsData.temp} labels={analyticsData.labels} unit="°C" />
              <MetricChart title="Air Humidity" value={`${telemetry.humid?.toFixed(0)}%`} trend="Realtime" icon="water_drop" color="#2d6a4f" dataPoints={analyticsData.humid} labels={analyticsData.labels} unit="%" />
              <MetricChart title="Soil Moisture" value={`${telemetry.soil}%`} trend="Realtime" icon="grass" color="#5c614d" dataPoints={analyticsData.soil} labels={analyticsData.labels} unit="%" />
            </div>

            <ForecastTable forecastList={forecastList} />
          </section>
        )}

        {/* VIEW 3: SETTINGS */}
        {activeTab === 'settings' && (
          <section className="max-w-4xl mx-auto space-y-6">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface">System Settings</h2>
              <p className="text-sm text-on-surface-variant mt-1">Cấu hình kết nối phần cứng và thông số nông học.</p>
            </header>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <ConnectionSettings formData={settingsForm} onChange={handleSettingsChange} />
              <FarmProfileSettings formData={settingsForm} onChange={handleSettingsChange} />

              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setActiveTab('dashboard')} className="px-6 py-2.5 rounded-lg border border-primary text-primary font-semibold text-sm hover:bg-surface-variant transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:opacity-90 shadow-sm transition-opacity">
                  Save Configuration
                </button>
              </div>
            </form>
          </section>
        )}
      </main>

      <MobileBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}