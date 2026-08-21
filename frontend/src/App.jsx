import React, { useState, useEffect } from 'react';
import { auth, dbService } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { GoogleGenAI } from '@google/genai';

import Sidebar from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import AlertToast from './components/layout/AlertToast';
import GoogleAuthModal from './components/layout/GoogleAuthModal';

import SensorCard from './components/dashboard/SensorCard';
import AiControlCard from './components/dashboard/AiControlCard';
import PumpStationCard from './components/dashboard/PumpStationCard';

import MetricChart from './components/analytics/MetricChart';
import ForecastTable from './components/analytics/ForecastTable';

import ConnectionSettings from './components/settings/ConnectionSettings';
import FarmProfileSettings from './components/settings/FarmProfileSettings';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [guestUid, setGuestUid] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [telemetry, setTelemetry] = useState({ temp: 0, humid: 0, soil: 0, light: 0, pump: 0 });
  const [settingsForm, setSettingsForm] = useState({});
  const [forecastList, setForecastList] = useState([]);
  const [aiDecision, setAiDecision] = useState(null);
  const [systemMode, setSystemMode] = useState('auto');
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  const triggerToast = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4000);
  };

  // 1. Kiểm tra link chia sẻ ?view=UID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) {
      setGuestUid(viewParam.trim());
      triggerToast('👀 Đang xem ở Chế độ Khách (Chỉ xem).');
    }
  }, []);

  // 2. Theo dõi trạng thái đăng nhập
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) setGuestUid(null);
    });
    return () => unsubscribe();
  }, []);

  const activeUid = currentUser ? currentUser.uid : guestUid;
  const isGuestMode = !currentUser && !!guestUid;

  // 3. Lắng nghe Telemetry & Forecast từ Firebase
  useEffect(() => {
    if (!activeUid) return;

    // Cảm biến Realtime
    const unsubTele = dbService.subscribeTelemetry(activeUid, (data) => {
      if (data) setTelemetry(data);
    });

    // Dự báo thời tiết (Cả Chủ vườn & Khách đều nhận được)
    const unsubForecast = dbService.subscribeForecast(activeUid, (list) => {
      if (list && list.length > 0) setForecastList(list);
    });

    // Cài đặt cá nhân (Chỉ tải khi là Chủ vườn)
    let unsubSettings = () => {};
    if (!isGuestMode) {
      unsubSettings = dbService.subscribeSettings(activeUid, (cfg) => {
        if (cfg) {
          setSettingsForm(cfg);
          if (cfg.owm_api_key && cfg.local_area) {
            fetchAndSyncWeather(activeUid, cfg.owm_api_key, cfg.local_area);
          }
        }
      });
    }

    return () => {
      unsubTele();
      unsubForecast();
      unsubSettings();
    };
  }, [activeUid, isGuestMode]);

  // Chủ vườn gọi OWM và lưu lên Firebase để Khách cùng xem
  const fetchAndSyncWeather = async (uid, apiKey, localArea) => {
    try {
      const city = localArea.split(',')[0].trim();
      const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city},VN&appid=${apiKey}&units=metric&lang=vi`);
      const data = await res.json();
      if (data.list) {
        const dailyMap = {};
        data.list.forEach((item) => {
          const date = item.dt_txt.split(' ')[0];
          if (!dailyMap[date]) {
            dailyMap[date] = {
              date,
              status: item.weather[0].description,
              main_weather: item.weather[0].main,
              temps: [],
              humidity: item.main.humidity + '%',
              wind: (item.wind.speed * 3.6).toFixed(1) + ' km/h',
              rainfall: (item.rain?.['3h'] || 0) + ' mm'
            };
          }
          dailyMap[date].temps.push(item.main.temp);
        });

        const formatted = Object.values(dailyMap).map((d) => ({
          ...d,
          temp_range: `${Math.max(...d.temps).toFixed(1)}° / ${Math.min(...d.temps).toFixed(1)}°`
        }));
        
        setForecastList(formatted);
        // Lưu lên Firebase nhánh /users/<UID>/forecast để Khách xem được
        await dbService.saveForecast(uid, formatted);
      }
    } catch (e) {
      console.warn("OWM error:", e);
    }
  };

  // Hàm Đăng xuất & Đổi tài khoản
  const handleLogout = async () => {
    try {
      if (currentUser) await signOut(auth);
      setGuestUid(null);
      setCurrentUser(null);
      setTelemetry({ temp: 0, humid: 0, soil: 0, light: 0, pump: 0 });
      setForecastList([]);
      window.history.pushState({}, document.title, window.location.pathname);
      triggerToast('Đã đăng xuất! Bạn có thể chọn tài khoản Google khác.');
    } catch (err) {
      triggerToast('Lỗi đăng xuất: ' + err.message, 'error');
    }
  };

  const handleSettingsChange = (e) => {
    setSettingsForm({ ...settingsForm, [e.target.name]: e.target.value });
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (isGuestMode) return;
    try {
      await dbService.saveSettings(currentUser.uid, settingsForm);
      if (settingsForm.owm_api_key && settingsForm.local_area) {
        await fetchAndSyncWeather(currentUser.uid, settingsForm.owm_api_key, settingsForm.local_area);
      }
      triggerToast('Đã lưu cài đặt và đồng bộ thời tiết thành công!');
      setTimeout(() => setActiveTab('dashboard'), 800);
    } catch (err) {
      triggerToast('Lỗi lưu: ' + err.message, 'error');
    }
  };

  // 3. Gọi trực tiếp Gemini AI với cơ chế tự động fallback model
  const handleTriggerAi = async () => {
    if (isGuestMode) {
      triggerToast('Chế độ Khách không thể chạy tính năng AI!', 'error');
      return;
    }
    if (!settingsForm.api_key) {
      triggerToast('Vui lòng nhập Google Gemini API Key trong Settings trước!', 'error');
      return;
    }

    triggerToast('AI đang phân tích vi khí hậu nông trại...');
    try {
      const prompt = `
      Bạn là Bác sĩ Nông nghiệp & Chuyên gia Tối ưu Nông trại AgroLogic.
      THÔNG TIN: ${settingsForm.crop_type || 'Cây trồng'} (${settingsForm.growth_stage || 'Phát triển'}) tại ${settingsForm.local_area || 'Việt Nam'}
      CẢM BIẾN: Nhiệt=${telemetry.temp}°C, Ẩm khí=${telemetry.humid}%, Ẩm đất=${telemetry.soil}%, Nắng=${telemetry.light === 1 ? 'Gắt' : 'Râm mát'}
      YÊU CẦU: Phân tích vi khí hậu, dự báo rủi ro sâu bệnh, và đưa ra trigger (ẩm đất bắt đầu tưới: 20-55) & target (ẩm ngắt tưới: 50-85).
      TRẢ VỀ JSON DUY NHẤT:
      {"status_summary": "...", "ai_action": "...", "disease_warning": "...", "trigger": 40, "target": 60}
      `;

      // Danh sách model thế hệ mới ưu tiên (theo thông báo từ Google)
      const targetModels = [
        settingsForm.ai_model || 'gemini-3.6-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-2.5-flash'
      ];
      // Lọc bỏ model trùng
      const uniqueModels = [...new Set(targetModels)];

      let responseText = '';
      let lastErr = null;

      // Gọi REST API trực tiếp tới Google endpoint v1beta
      for (const modelName of uniqueModels) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${settingsForm.api_key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { response_mime_type: 'application/json' }
            })
          });

          const data = await res.json();
          if (data.error) {
            lastErr = data.error.message;
            console.warn(`Model ${modelName} không khả dụng, đang thử model tiếp theo...`);
            continue;
          }

          if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text;
            break; // Thành công!
          }
        } catch (e) {
          lastErr = e.message;
        }
      }

      if (!responseText) {
        throw new Error(lastErr || 'Không tìm thấy model Gemini nào hoạt động trên tài khoản của bạn.');
      }

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const decision = JSON.parse(cleanJson);
      setAiDecision(decision);

      // Tự động đẩy ngưỡng tưới xuống ESP32 qua Realtime Database
      await dbService.sendControl(currentUser.uid, {
        mode: 'auto',
        trigger: Number(decision.trigger || 40),
        target: Number(decision.target || 60)
      });

      triggerToast('✅ AI đã tối ưu hóa và đồng bộ lệnh xuống ESP32!');
    } catch (err) {
      triggerToast('Lỗi AI: ' + err.message, 'error');
    }
  };

  const handleToggleMode = async () => {
    if (isGuestMode) {
      triggerToast('Chế độ Khách không có quyền đổi chế độ!', 'error');
      return;
    }
    const newMode = systemMode === 'auto' ? 'manual' : 'auto';
    setSystemMode(newMode);

    // Gửi lệnh xuống Firebase
    await dbService.sendControl(currentUser.uid, {
      mode: newMode
    });
    triggerToast(`👉 Đã chuyển sang ${newMode.toUpperCase()} MODE!`);
  };

  // 2. Xử lý Bật / Tắt Bơm Thủ Công
  const handleTogglePump = async (isChecked) => {
    if (isGuestMode) {
      triggerToast('Bạn đang ở Chế độ Khách (Chỉ xem)!', 'error');
      return;
    }
    if (systemMode === 'auto') {
      triggerToast('Vui lòng bấm "Chuyển sang Manual Mode" trước khi gạt công tắc!', 'error');
      return;
    }

    // Cập nhật trạng thái giao diện ngay lập tức để công tắc di chuyển mượt mà
    setTelemetry((prev) => ({ ...prev, pump: isChecked ? 1 : 0 }));

    // Gửi lệnh xuống Firebase
    await dbService.sendControl(currentUser.uid, {
      mode: 'manual',
      manual_relay: isChecked ? 1 : 0
    });

    triggerToast(isChecked ? '⚡ Đã gửi lệnh BẬT BƠM!' : '🛑 Đã gửi lệnh TẮT BƠM!');
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/?view=${activeUid}`;
    navigator.clipboard.writeText(shareUrl);
    triggerToast('🔗 Đã copy Link chia sẻ! Khách xem được cả Cảm biến & Thời tiết.');
  };

  if (!currentUser && !guestUid) {
    return <GoogleAuthModal onGuestLogin={(uid) => setGuestUid(uid)} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased bg-background text-on-background">
      <AlertToast alert={alert} onClose={() => setAlert({ ...alert, show: false })} />
      
      {/* Mobile Top Header kèm nút Đăng Xuất */}
      <header className="md:hidden w-full flex justify-between items-center px-4 h-16 shadow-sm bg-surface z-40 fixed top-0 border-b border-outline-variant/20">
        <div className="text-xl font-bold text-primary">AgroLogic</div>
        <div className="flex items-center gap-2">
          <button onClick={handleLogout} title="Đăng xuất / Đổi tài khoản" className="p-2 rounded-lg text-error hover:bg-error-container/30 flex items-center gap-1 text-xs font-semibold">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span>Thoát</span>
          </button>
        </div>
      </header>
      
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        deviceId={activeUid}
        isGuest={isGuestMode}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 px-4 md:px-10 py-6 md:py-8 mt-16 md:mt-0 max-w-[1440px] mx-auto w-full overflow-y-auto pb-20 md:pb-8">
        
        {/* BANNER CHẾ ĐỘ KHÁCH */}
        {isGuestMode && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span>Bạn đang xem nông trại <strong>{activeUid}</strong> ở <strong>Chế độ Khách (Chỉ xem Cảm biến & Thời tiết)</strong>.</span>
            </div>
            <button onClick={handleLogout} className="font-bold underline hover:opacity-80 ml-2">
              Đăng nhập tài khoản Google
            </button>
          </div>
        )}

        {/* VIEW 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <section className="space-y-6">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 pb-2 border-b border-outline-variant/20">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Field Overview</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-on-surface-variant flex-wrap">
                  <span>Khu vực: <strong>{settingsForm.local_area || 'Chưa cấu hình'}</strong></span>
                  <span>•</span>
                  <span>UID:</span>
                  <button
                    onClick={copyShareLink}
                    title="Bấm để copy link chia sẻ"
                    className="font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1 transition-all"
                  >
                    <span>{activeUid}</span>
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isGuestMode && (
                  <button
                    onClick={copyShareLink}
                    className="px-4 py-2.5 rounded-lg border-2 border-primary bg-white text-primary font-semibold text-sm hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    <span>Chia Sẻ Nông Trại</span>
                  </button>
                )}

                {!isGuestMode && (
                  <button
                    onClick={handleTriggerAi}
                    className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    <span>AI Tối Ưu Nông Trại</span>
                  </button>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SensorCard type="temp" value={telemetry.temp?.toFixed(1) || 0} targetText="Target: 24°C - 30°C" />
              <SensorCard type="humid" value={telemetry.humid?.toFixed(0) || 0} />
              <SensorCard 
                type="soil" 
                value={telemetry.soil || 0} 
                isHighlight 
                triggerVal={telemetry.trigger || 40}
                targetVal={telemetry.target || 60}
              />
              <SensorCard type="light" value={telemetry.light} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AiControlCard aiDecision={aiDecision} aiModel={settingsForm.ai_model} onTriggerAi={handleTriggerAi} soilValue={telemetry.soil || 0} isGuest={isGuestMode} />
              <PumpStationCard isPumpOn={telemetry.pump === 1} systemMode={systemMode} onToggleMode={handleToggleMode} onTogglePump={handleTogglePump} isGuest={isGuestMode} />
            </div>
          </section>
        )}

        {/* VIEW 2: ANALYTICS & FORECAST */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Analytics & Forecast</h2>
                <p className="text-sm text-on-surface-variant mt-1">Dữ liệu cảm biến thời gian thực & Dự báo thời tiết từ OpenWeatherMap.</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MetricChart title="Air Temperature" value={`${telemetry.temp?.toFixed(1)}°C`} trend="Realtime" icon="thermostat" color="#0f5238" dataPoints={[telemetry.temp]} unit="°C" />
              <MetricChart title="Air Humidity" value={`${telemetry.humid?.toFixed(0)}%`} trend="Realtime" icon="water_drop" color="#2d6a4f" dataPoints={[telemetry.humid]} unit="%" />
              <MetricChart title="Soil Moisture" value={`${telemetry.soil}%`} trend="Realtime" icon="grass" color="#5c614d" dataPoints={[telemetry.soil]} unit="%" />
            </div>

            <ForecastTable forecastList={forecastList} />
          </section>
        )}

        {/* VIEW 3: SETTINGS */}
        {activeTab === 'settings' && !isGuestMode && (
          <section className="max-w-4xl mx-auto space-y-6">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface">System Settings</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Cấu hình tài khoản và thông số nông học của riêng bạn.
              </p>
            </header>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-center justify-between">
              <div>
                <div className="text-xs text-on-surface-variant">Mã UID của bạn (Nhập vào Wi-Fi ESP32):</div>
                <div className="font-mono text-sm font-bold text-primary select-all">{activeUid}</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { navigator.clipboard.writeText(activeUid); triggerToast("Đã copy UID!"); }}
                  className="px-3 py-1.5 bg-white border border-primary/30 rounded-lg text-xs font-semibold text-primary hover:bg-primary/5"
                >
                  Copy UID
                </button>
                <button 
                  onClick={copyShareLink}
                  className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:opacity-90 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">share</span>
                  <span>Chia Sẻ Link</span>
                </button>
              </div>
            </div>

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