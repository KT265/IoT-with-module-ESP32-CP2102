import React from 'react';

export default function SensorCard({ type, value, status, trend, targetText, isHighlight }) {
  const configs = {
    temp: {
      title: 'Air Temp',
      icon: 'thermostat',
      iconColor: 'text-primary',
      unit: '°C',
      renderExtra: () => (
        <span className="text-xs font-semibold text-primary bg-primary-container/20 px-2 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">arrow_upward</span> {trend || '1.2°'}
        </span>
      )
    },
    humid: {
      title: 'Air Humidity',
      icon: 'water_drop',
      iconColor: 'text-secondary',
      unit: '%',
      renderExtra: () => (
        <span className="text-xs font-semibold text-secondary bg-surface-variant px-2 py-1 rounded-full flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">horizontal_rule</span> Stable
        </span>
      )
    },
    soil: {
      title: 'Soil Moisture',
      icon: 'grass',
      iconColor: 'text-tertiary',
      unit: '%',
      renderExtra: () => (
        <span
          className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
            value < 45 ? 'text-error bg-error-container' : 'text-primary bg-primary-container/20'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {value < 45 ? 'warning' : 'check'}
          </span>{' '}
          {value < 45 ? 'Low' : 'Optimal'}
        </span>
      )
    },
    light: {
      title: 'Light Level',
      icon: 'light_mode',
      iconColor: 'text-[#F59E0B]',
      unit: ' lux',
      renderExtra: () => (
        <span className="text-xs font-semibold text-[#F59E0B] bg-amber-100 px-2 py-1 rounded-full">
          {value === 1 ? 'Nắng Gắt' : 'Râm Mát'}
        </span>
      )
    }
  };

  const current = configs[type];

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-5 ambient-shadow card-hover border transition-all flex flex-col justify-between h-[160px] ${
        isHighlight ? 'border-primary/20' : 'border-transparent'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className={`material-symbols-outlined ${current.iconColor}`}>{current.icon}</span>
          <span className="text-sm font-medium">{current.title}</span>
        </div>
        {current.renderExtra()}
      </div>

      <div>
        <div className="text-4xl font-bold text-on-surface">
          {type === 'light' ? (value === 1 ? 850 : 200) : value}
          <span className="text-2xl opacity-60 font-normal">{current.unit}</span>
        </div>

        {type === 'humid' && (
          <div className="w-full bg-surface-variant h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-secondary h-full transition-all duration-500"
              style={{ width: `${value}%` }}
            ></div>
          </div>
        )}

        {targetText && (
          <div
            className={`text-xs mt-1 font-medium ${
              type === 'soil' && value < 45 ? 'text-error font-semibold' : 'text-on-surface-variant'
            }`}
          >
            {targetText}
          </div>
        )}
      </div>
    </div>
  );
}