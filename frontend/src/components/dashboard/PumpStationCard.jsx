import React from 'react';

export default function PumpStationCard({ isPumpOn, systemMode, onToggleMode, onTogglePump, isGuest }) {
  const isAuto = systemMode === 'auto';

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 ambient-shadow border border-outline-variant/30 flex flex-col justify-between min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">water_pump</span>
          <h3 className="text-xl font-bold text-on-surface">Pump Station 1</h3>
        </div>
        <span
          className={`px-2.5 py-1 text-xs rounded font-bold uppercase tracking-wider ${
            isPumpOn
              ? 'bg-primary-container text-on-primary-container animate-pulse'
              : 'bg-surface-variant text-on-surface-variant'
          }`}
        >
          {isPumpOn ? 'ĐANG BƠM 💧' : 'STANDBY 🛑'}
        </span>
      </div>

      <div className="flex flex-col justify-center items-center py-6 border-y border-outline-variant/30 my-2">
        <div
          className={`text-4xl font-bold mb-4 flex items-center gap-2 transition-all ${
            isPumpOn ? 'text-primary scale-105' : 'text-on-surface-variant opacity-70'
          }`}
        >
          {isPumpOn ? 'ON' : 'OFF'}
        </div>

        {/* CÔNG TẮC BẬT TẮT THỦ CÔNG */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-on-surface-variant">Công tắc bơm</span>
          <label className={`flex items-center relative select-none ${isAuto || isGuest ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              disabled={isAuto || isGuest}
              checked={isPumpOn}
              onChange={(e) => onTogglePump(e.target.checked)}
              className="sr-only"
            />
            {/* Thanh trượt */}
            <div
              className={`w-14 h-8 rounded-full transition-colors duration-300 ${
                isPumpOn ? 'bg-primary' : 'bg-outline-variant'
              }`}
            ></div>
            {/* Nút tròn di chuyển */}
            <div
              className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow-md ${
                isPumpOn ? 'translate-x-6' : 'translate-x-0'
              }`}
            ></div>
          </label>
        </div>

        {isAuto && (
          <span className="text-[11px] text-outline mt-2 italic">
            (Chuyển sang Manual Mode để gạt công tắc)
          </span>
        )}
      </div>

      {/* NÚT CHUYỂN ĐỔI CHẾ ĐỘ AUTO / MANUAL */}
      {!isGuest ? (
        <button
          onClick={onToggleMode}
          className={`w-full py-2.5 border-2 rounded-lg text-sm transition-all font-semibold flex items-center justify-center gap-2 shadow-sm ${
            isAuto
              ? 'border-primary text-primary hover:bg-primary/5'
              : 'border-amber-600 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isAuto ? 'engineering' : 'autorenew'}
          </span>
          <span>{isAuto ? 'Chuyển sang Manual Mode' : 'Trở về Auto Mode'}</span>
        </button>
      ) : (
        <div className="text-center text-xs text-outline py-2 font-medium">
          🔒 Khách chỉ có quyền xem
        </div>
      )}
    </div>
  );
}