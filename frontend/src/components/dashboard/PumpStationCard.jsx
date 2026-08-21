// src/components/dashboard/PumpStationCard.jsx
import React from 'react';

export default function PumpStationCard({ isPumpOn, systemMode, onToggleMode, onTogglePump }) {
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
              ? 'bg-primary-container text-on-primary-container'
              : 'bg-surface-variant text-on-surface-variant'
          }`}
        >
          {isPumpOn ? 'Active' : 'Standby'}
        </span>
      </div>

      <div className="flex flex-col justify-center items-center py-6 border-y border-outline-variant/30 my-2">
        <div
          className={`text-4xl font-bold mb-4 flex items-center gap-2 ${
            isPumpOn ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          {isPumpOn ? 'ON' : 'OFF'}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-on-surface-variant">System Power</span>
          <label className="flex items-center cursor-pointer relative">
            <input
              type="checkbox"
              checked={isPumpOn}
              onChange={(e) => onTogglePump(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-14 h-8 rounded-full transition-colors duration-300 ${
                isPumpOn ? 'bg-primary' : 'bg-outline-variant'
              }`}
            ></div>
            <div
              className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 shadow-sm ${
                isPumpOn ? 'translate-x-6' : ''
              }`}
            ></div>
          </label>
        </div>
      </div>

      <button
        onClick={onToggleMode}
        className="w-full py-2.5 border-2 border-primary text-primary rounded-lg text-sm hover:bg-primary/5 transition-colors font-semibold flex items-center justify-center gap-2"
      >
        <span className="material-symbols-outlined text-[18px]">engineering</span>
        <span>{systemMode === 'auto' ? 'Manual Mode' : 'Return to Auto Mode'}</span>
      </button>
    </div>
  );
}