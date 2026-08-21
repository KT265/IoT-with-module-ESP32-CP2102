import React, { useState } from 'react';

export default function ConnectionSettings({ formData, onChange }) {
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOwmKey, setShowOwmKey] = useState(false);

  return (
    <div className="bg-white rounded-xl p-6 md:p-8 ambient-shadow border border-outline-variant/30">
      <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
        <span className="material-symbols-outlined text-primary fill">router</span>
        <h3 className="text-xl font-bold text-on-surface">Connection Settings</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device ID */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="device_id">
            Device ID
          </label>
          <input
            id="device_id"
            name="device_id"
            type="text"
            value={formData.device_id || ''}
            onChange={onChange}
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          />
          <span className="text-xs text-outline">
            Mã ID duy nhất in ra trên Serial Monitor ESP32.
          </span>
        </div>

        {/* AI Model Selector */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="ai_model">
            AI Engine Model
          </label>
          <select
            id="ai_model"
            name="ai_model"
            value={formData.ai_model || 'gemini-3.5-flash'}
            onChange={onChange}
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Mới nhất & Khuyên dùng)</option>
            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Siêu nhanh)</option>
            <option value="gemini-3.1-pro">Gemini 3.1 Pro (Suy luận sâu)</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>

        {/* Google Gemini API Key */}
        <div className="flex flex-col gap-2 md:col-span-2 mt-2">
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
            Lấy miễn phí tại aistudio.google.com
          </span>
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
            Dùng để lấy dự báo thời tiết 5-7 ngày. Lấy tại openweathermap.org
          </span>
        </div>
      </div>
    </div>
  );
}