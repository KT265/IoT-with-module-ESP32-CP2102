import React, { useState, useEffect, useRef } from 'react';
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
  const [analyticsData, setAnalyticsData] = useState({ labels: [], temp: [], humid: [], soil: [] });
  const [aiDecision, setAiDecision] = useState(null);
  const [systemMode, setSystemMode] = useState('auto');
  const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

  // Dùng ref để lấy giá trị cảm biến mới nhất trong interval
  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  const triggerToast = (message, type = 'success') => {
    setAlert({ show: true, message, type });
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 4000);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    if (viewParam) setGuestUid(viewParam.trim());
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) setGuestUid(null);
    });
    return () => unsubscribe();
  }, []);

  const activeUid = currentUser ? currentUser.uid : guestUid;
  const isGuestMode = !currentUser && !!guestUid;

  // Lắng nghe dữ liệu Firebase
  useEffect(() => {
    if (!activeUid) return;

    const unsubTele = dbService.subscribeTelemetry(activeUid, (data) => {
      if (data) setTelemetry(data);
    });

    const unsubForecast = dbService.subscribeForecast(activeUid, (list) => {
      if (list && list.length > 0) setForecastList(list);
    });

    // LẮNG NGHE LỊCH SỬ BIỂU ĐỒ 24H
    const unsubHistory = dbService.subscribeHistory(activeUid, (hist) => {
      const today = new Date().toISOString().split('T')[0];
      if (hist && hist.date === today) {
        setAnalyticsData(hist);
      } else {
        // Nếu qua ngày mới (12:00 AM), reset biểu đồ về rỗng
        setAnalyticsData({ labels: [], temp: [], humid: [], soil: [], date: today });
      }
    });

    let unsubSettings = () => {};
    if (!isGuestMode) {
      unsubSettings = dbService.subscribeSettings(activeUid, (cfg) => {
        if (cfg) setSettingsForm(cfg);
      });
    }

    return () => {
      unsubTele();
      unsubForecast();
      unsubHistory();
      unsubSettings();
    };
  }, [activeUid, isGuestMode]);

  // CƠ CHẾ LẤY MẪU BIỂU ĐỒ 5 PHÚT / LẦN & RESET LÚC 00:00
  useEffect(() => {
    if (!currentUser) return; // Chỉ chủ vườn ghi lịch sử lên DB

    const recordPoint = async () => {
      const current = telemetryRef.current;
      if (current.temp === 0 && current.soil === 0) return; // Bỏ qua nếu chưa có số liệu

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timeLabel = now.toTimeString().slice(0, 5); // "HH:MM"

      setAnalyticsData((prev) => {
        let updated;
        if (!prev || prev.date !== today) {
          // BƯỚC SANG 12:00 AM (00:00) -> TỰ ĐỘNG XÓA BIỂU ĐỒ CŨ
          updated = {
            date: today,
            labels: [timeLabel],
            temp: [current.temp],
            humid: [current.humid],
            soil: [current.soil]
          };
        } else {
          updated = {
            date: today,
            labels: [...prev.labels, timeLabel],
            temp: [...prev.temp, current.temp],
            humid: [...prev.humid, current.humid],
            soil: [...prev.soil, current.soil]
          };
        }

        // Lưu lên Firebase RTDB để đồng bộ cho cả khách xem
        dbService.saveHistory(currentUser.uid, updated);
        return updated;
      });
    };

    // Lấy mẫu ngay khi mở web và lặp lại mỗi 5 phút (300,000 ms)
    recordPoint();
    const interval = setInterval(recordPoint, 300000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      if (currentUser) await signOut(auth);
      setGuestUid(null);
      setCurrentUser(null);
      setTelemetry({ temp: 0, humid: 0, soil: 0, light: 0, pump: 0 });
      setAnalyticsData({ labels: [], temp: [], humid: [], soil: [] });
      window.history.pushState({}, document.title, window.location.pathname);
      triggerToast('Đã đăng xuất!');
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
      triggerToast('Đã lưu cấu hình thành công!');
      setTimeout(() => setActiveTab('dashboard'), 800);
    } catch (err) {
      triggerToast('Lỗi lưu: ' + err.message, 'error');
    }
  };

  // Hàm chuyển đổi File ảnh sang Base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
        const base64Data = result.split(',')[1];
        resolve({ base64: base64Data, mimeType: file.type });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // HÀM KÍCH HOẠT PHÂN TÍCH AI (HỖ TRỢ CẢ CÓ ẢNH VÀ KHÔNG ẢNH)
  const handleTriggerAi = async (imageFile = null) => {
    if (isGuestMode) {
      triggerToast('Chế độ Khách không thể chạy tính năng AI!', 'error');
      return;
    }
    if (!settingsForm.api_key) {
      triggerToast('Vui lòng nhập Google Gemini API Key trong Settings trước!', 'error');
      return;
    }

    triggerToast(imageFile ? '🔬 Bác sĩ AI đang soi ảnh bệnh & phân tích vi khí hậu...' : 'AI đang phân tích vi khí hậu nông trại...');

    try {
      // 1. Chuyển ảnh sang Base64 nếu có
      let imagePart = null;
      if (imageFile instanceof File) {
        const imgData = await fileToBase64(imageFile);
        imagePart = {
          inline_data: {
            mime_type: imgData.mimeType,
            data: imgData.base64
          }
        };
      }

      // 2. Chuẩn bị tóm tắt dự báo thời tiết 5-7 ngày
      let weatherSummary = "Chưa có dữ liệu dự báo";
      if (forecastList && forecastList.length > 0) {
        weatherSummary = forecastList.slice(0, 5).map((d) => 
          `- Ngày ${d.date}: ${d.status} | Nhiệt độ: ${d.temp_range} | Độ ẩm: ${d.humidity} | Mưa: ${d.rainfall}`
        ).join("\n");
      }

      // 3. Xây dựng Prompt thích ứng
      const promptText = `
      Bạn là Bác sĩ Cây trồng & Chuyên gia Nông nghiệp Thông minh AgroLogic.

      THÔNG TIN CANH TÁC:
      - Loại cây: ${settingsForm.crop_type || 'Cây trồng'} (Giai đoạn: ${settingsForm.growth_stage || 'Đang phát triển'})
      - Khu vực: ${settingsForm.local_area || 'Việt Nam'}

      DỮ LIỆU CẢM BIẾN VI KHÍ HẬU (REALTIME):
      - Nhiệt độ vườn: ${telemetry.temp}°C
      - Độ ẩm không khí: ${telemetry.humid}%
      - Độ ẩm đất: ${telemetry.soil}%
      - Tình trạng nắng: ${telemetry.light === 1 ? 'Nắng gắt' : 'Râm mát / Đêm'}

      DỰ BÁO THỜI TIẾT 5-7 NGÀY TỚI (OPENWEATHERMAP):
      ${weatherSummary}

      ${imagePart ? "NGƯỜI DÙNG CÓ GỬI KÈM HÌNH ẢNH CÂY TRỒNG/LÁ BỊ BỆNH: Hãy chẩn đoán chính xác tên bệnh hại và đưa ra phác đồ điều trị, cách khắc phục cụ thể." : "KHÔNG CÓ HÌNH ẢNH ĐÍNH KÈM: Phân tích dựa trên vi khí hậu và dự báo thời tiết."}

      NHIỆM VỤ:
      1. Nếu có ảnh: Điền tên bệnh chính xác vào trường "plant_disease" và cách xử lý vào "disease_treatment". Nếu không có ảnh thì để rỗng "".
      2. Phân tích vi khí hậu kết hợp với tình trạng bệnh (nếu có) để đưa ra "status_summary", "ai_action", và "disease_warning".
      3. Đưa ra 2 ngưỡng tưới điều khiển ESP32:
         - trigger: Độ ẩm đất (%) bắt đầu tưới (20 - 55).
         - target: Độ ẩm đất (%) ngắt bơm (50 - 85).

      BẮT BUỘC TRẢ VỀ DUY NHẤT ĐỊNH DẠNG JSON:
      {
        "plant_disease": "Tên bệnh kèm tên khoa học (nếu có ảnh) hoặc rỗng",
        "disease_treatment": "Cách điều trị, xử lý bệnh chi tiết (nếu có ảnh) hoặc rỗng",
        "status_summary": "Tóm tắt trạng thái (1-2 câu)",
        "ai_action": "Hành động điều khiển tưới chi tiết (1-2 câu)",
        "disease_warning": "Cảnh báo sinh học & sâu bệnh",
        "trigger": 40,
        "target": 60
      }
      `;

      // 4. Đóng gói payload gửi sang Gemini API
      const parts = [{ text: promptText }];
      if (imagePart) parts.push(imagePart);

      const targetModels = [
        settingsForm.ai_model || 'gemini-3.6-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-2.5-flash'
      ];
      const uniqueModels = [...new Set(targetModels)];

      let responseText = '';
      let lastErr = null;

      for (const modelName of uniqueModels) {
        try {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${settingsForm.api_key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: parts }],
              generationConfig: { response_mime_type: 'application/json' }
            })
          });

          const data = await res.json();
          if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text;
            break;
          } else if (data.error) {
            lastErr = data.error.message;
          }
        } catch (e) {
          lastErr = e.message;
        }
      }

      if (!responseText) throw new Error(lastErr || 'Không gọi được model AI');

      const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const decision = JSON.parse(cleanJson);
      setAiDecision(decision);

      // Tự động đẩy ngưỡng tưới xuống ESP32
      await dbService.sendControl(currentUser.uid, {
        mode: 'auto',
        trigger: Number(decision.trigger || 40),
        target: Number(decision.target || 60)
      });

      triggerToast(decision.plant_disease ? `✅ Đã chẩn đoán xong: ${decision.plant_disease}!` : '✅ AI đã phân tích và nạp lệnh xuống ESP32!');
    } catch (err) {
      triggerToast('Lỗi AI: ' + err.message, 'error');
    }
  };

  const handleToggleMode = async () => {
    if (isGuestMode) return;
    const newMode = systemMode === 'auto' ? 'manual' : 'auto';
    setSystemMode(newMode);
    await dbService.sendControl(currentUser.uid, { mode: newMode });
    triggerToast(`👉 Đã chuyển sang ${newMode.toUpperCase()} MODE!`);
  };

  const handleTogglePump = async (isChecked) => {
    if (isGuestMode) return;
    if (systemMode === 'auto') {
      triggerToast('Vui lòng bấm "Chuyển sang Manual Mode" trước!', 'error');
      return;
    }
    setTelemetry((prev) => ({ ...prev, pump: isChecked ? 1 : 0 }));
    await dbService.sendControl(currentUser.uid, {
      mode: 'manual',
      manual_relay: isChecked ? 1 : 0
    });
    triggerToast(isChecked ? '⚡ Đã gửi lệnh BẬT BƠM!' : '🛑 Đã gửi lệnh TẮT BƠM!');
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}/?view=${activeUid}`;
    navigator.clipboard.writeText(shareUrl);
    triggerToast('🔗 Đã copy Link chia sẻ!');
  };

  if (!currentUser && !guestUid) {
    return <GoogleAuthModal onGuestLogin={(uid) => setGuestUid(uid)} />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row antialiased bg-background text-on-background">
      <AlertToast alert={alert} onClose={() => setAlert({ ...alert, show: false })} />
      
      <header className="md:hidden w-full flex justify-between items-center px-4 h-16 shadow-sm bg-surface z-40 fixed top-0 border-b border-outline-variant/20">
        <div className="text-xl font-bold text-primary">AgroLogic</div>
        <button onClick={handleLogout} className="p-2 rounded-lg text-error hover:bg-error-container/30 flex items-center gap-1 text-xs font-semibold">
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span>Thoát</span>
        </button>
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
        
        {isGuestMode && (
          <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              <span>Đang xem nông trại <strong>{activeUid}</strong> ở <strong>Chế độ Khách</strong>.</span>
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
                  <button onClick={copyShareLink} className="font-mono text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded border border-primary/20 flex items-center gap-1">
                    <span>{activeUid}</span>
                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isGuestMode && (
                  <button onClick={copyShareLink} className="px-4 py-2.5 rounded-lg border-2 border-primary bg-white text-primary font-semibold text-sm hover:bg-primary/5 transition-all flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    <span>Chia Sẻ Nông Trại</span>
                  </button>
                )}
                {!isGuestMode && (
                  <button onClick={handleTriggerAi} className="px-4 py-2.5 rounded-lg bg-primary text-on-primary font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">psychology</span>
                    <span>AI Tối Ưu Nông Trại</span>
                  </button>
                )}
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SensorCard type="temp" value={telemetry.temp?.toFixed(1) || 0} targetText="Target: 24°C - 30°C" />
              <SensorCard type="humid" value={telemetry.humid?.toFixed(0) || 0} />
              <SensorCard type="soil" value={telemetry.soil || 0} isHighlight triggerVal={telemetry.trigger || 40} targetVal={telemetry.target || 60} />
              <SensorCard type="light" value={telemetry.light} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AiControlCard aiDecision={aiDecision} aiModel={settingsForm.ai_model} onTriggerAi={handleTriggerAi} soilValue={telemetry.soil || 0} isGuest={isGuestMode} />
              <PumpStationCard isPumpOn={telemetry.pump === 1} systemMode={systemMode} onToggleMode={handleToggleMode} onTogglePump={handleTogglePump} isGuest={isGuestMode} />
            </div>
          </section>
        )}

        {/* VIEW 2: ANALYTICS & FORECAST (HIỂN THỊ BIỂU ĐỒ 24H THEO MẪU 5 PHÚT) */}
        {activeTab === 'analytics' && (
          <section className="space-y-6">
            <header className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Analytics & Forecast</h2>
                <p className="text-sm text-on-surface-variant mt-1">Biểu đồ cảm biến 24h trong ngày (ghi mẫu 5 phút/lần - tự reset lúc 00:00).</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <MetricChart 
                title="Air Temperature" 
                value={`${telemetry.temp?.toFixed(1)}°C`} 
                trend="Realtime" 
                icon="thermostat" 
                color="#0f5238" 
                dataPoints={analyticsData.temp} 
                labels={analyticsData.labels} 
                unit="°C" 
              />
              <MetricChart 
                title="Air Humidity" 
                value={`${telemetry.humid?.toFixed(0)}%`} 
                trend="Realtime" 
                icon="water_drop" 
                color="#2d6a4f" 
                dataPoints={analyticsData.humid} 
                labels={analyticsData.labels} 
                unit="%" 
              />
              <MetricChart 
                title="Soil Moisture" 
                value={`${telemetry.soil}%`} 
                trend="Realtime" 
                icon="grass" 
                color="#5c614d" 
                dataPoints={analyticsData.soil} 
                labels={analyticsData.labels} 
                unit="%" 
              />
            </div>

            <ForecastTable forecastList={forecastList} />
          </section>
        )}

        {/* VIEW 3: SETTINGS */}
        {activeTab === 'settings' && !isGuestMode && (
          <section className="max-w-4xl mx-auto space-y-6">
            <header>
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface">System Settings</h2>
              <p className="text-sm text-on-surface-variant mt-1">Cấu hình API và thông số canh tác.</p>
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