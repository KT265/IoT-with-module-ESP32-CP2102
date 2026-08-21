import React, { useState, useEffect } from 'react';

export default function ConnectionSettings({ formData, onChange }) {
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOwmKey, setShowOwmKey] = useState(false);
  const [modelsList, setModelsList] = useState([
    { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash (Mới nhất & Khuyên dùng)' },
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' }
  ]);
  const [loadingModels, setLoadingModels] = useState(false);

  // TỰ ĐỘNG QUÉT DANH SÁCH MODEL KHẢ DỤNG TỪ GOOGLE KHI CÓ API KEY
  useEffect(() => {
    const key = formData.api_key?.trim();
    if (!key || !key.startsWith('AIza')) return;

    setLoadingModels(true);
    fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.models) {
          const valid = data.models
            .filter((m) => 
              m.supportedGenerationMethods?.includes('generateContent') &&
              !m.name.includes('embedding') &&
              !m.name.includes('aqa') &&
              !m.name.includes('imagen')
            )
            .map((m) => {
              const cleanId = m.name.replace('models/', '');
              return {
                id: cleanId,
                name: `${m.displayName || cleanId} (${cleanId})`
              };
            });

          if (valid.length > 0) {
            // Sắp xếp đưa các model 3.6 / 3.5 / flash lên đầu
            valid.sort((a, b) => b.id.localeCompare(a.id));
            setModelsList(valid);
          }
        }
      })
      .catch((err) => console.warn('Không thể tự động tải danh sách model:', err))
      .finally(() => setLoadingModels(false));
  }, [formData.api_key]);

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 ambient-shadow border border-outline-variant/30">
      <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
        <span className="material-symbols-outlined text-primary fill">api</span>
        <h3 className="text-xl font-bold text-on-surface">Cấu Hình API Trí Tuệ Nhân Tạo & Khí Tượng</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Gemini API Key */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="api_key">
            Google Gemini API Key
          </label>
          <div className="relative">
            <input
              id="api_key"
              name="api_key"
              type={showGeminiKey ? 'text' : 'password'}
              value={formData.api_key || ''}
              onChange={onChange}
              placeholder="AIzaSy..."
              className="w-full rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowGeminiKey(!showGeminiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showGeminiKey ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          <span className="text-xs text-outline">
            Nhập Key từ <strong>aistudio.google.com</strong>. Hệ thống sẽ tự động quét các model AI mới nhất khả dụng cho tài khoản của bạn.
          </span>
        </div>

        {/* AI Model Selector (Tự động cập nhật từ Google) */}
        <div className="flex flex-col gap-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-on-surface-variant" htmlFor="ai_model">
              AI Engine Model (Mô hình trí tuệ nhân tạo)
            </label>
            {loadingModels && <span className="text-xs text-primary animate-pulse font-medium">Đang cập nhật model mới từ Google...</span>}
          </div>
          <select
            id="ai_model"
            name="ai_model"
            value={formData.ai_model || 'gemini-3.6-flash'}
            onChange={onChange}
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          >
            {modelsList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* OpenWeatherMap API Key */}
        <div className="flex flex-col gap-2 md:col-span-2 mt-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="owm_api_key">
            OpenWeatherMap API Key
          </label>
          <div className="relative">
            <input
              id="owm_api_key"
              name="owm_api_key"
              type={showOwmKey ? 'text' : 'password'}
              value={formData.owm_api_key || ''}
              onChange={onChange}
              placeholder="e.g. 84f29d..."
              className="w-full rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => setShowOwmKey(!showOwmKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary"
            >
              <span className="material-symbols-outlined text-[20px]">
                {showOwmKey ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
          <span className="text-xs text-outline">
            Dùng để tự động tải dữ liệu dự báo thời tiết 7 ngày. Lấy miễn phí tại <strong>openweathermap.org</strong>.
          </span>
        </div>
      </div>
    </div>
  );
}