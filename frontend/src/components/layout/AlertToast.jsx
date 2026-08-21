import React from 'react';

export default function AlertToast({ alert, onClose }) {
  if (!alert?.show) return null;

  const palette = {
    success: {
      wrapper: 'border-emerald-200 bg-emerald-50 text-emerald-900',
      icon: 'check_circle'
    },
    error: {
      wrapper: 'border-red-200 bg-red-50 text-red-900',
      icon: 'error'
    },
    info: {
      wrapper: 'border-sky-200 bg-sky-50 text-sky-900',
      icon: 'info'
    }
  };

  const current = palette[alert.type] || palette.success;

  return (
    <div className="fixed right-4 top-4 z-[60]">
      <div className={`flex items-start gap-3 max-w-sm rounded-xl border px-4 py-3 shadow-lg ${current.wrapper}`}>
        <span className="material-symbols-outlined text-[20px]">{current.icon}</span>
        <div className="flex-1 text-sm font-medium leading-5">{alert.message}</div>
        <button
          type="button"
          onClick={onClose}
          className="ml-2 text-current/70 transition-opacity hover:text-current"
          aria-label="Close notification"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
}