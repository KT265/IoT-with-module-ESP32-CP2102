import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, deviceId, isGuest, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'analytics', label: 'Analytics & Forecast', icon: 'insights' },
    ...(!isGuest ? [{ id: 'settings', label: 'Settings', icon: 'settings' }] : [])
  ];

  const userEmail = isGuest ? 'Chế độ Khách (Viewer)' : (localStorage.getItem('agrologic_email') || 'Chủ Vườn');

  return (
    <nav className="hidden md:flex flex-col py-8 bg-surface-container-low shadow-md h-screen w-64 sticky top-0 z-30 flex-shrink-0">
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold text-primary tracking-tight">AgroLogic</h1>
        <p className="text-xs text-on-surface-variant font-medium">Smart Farming Cloud</p>
      </div>

      <div className="flex flex-col gap-2 flex-grow px-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${
                isActive
                  ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'fill' : ''}`}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* User Info & Nút Thoát */}
      <div className="px-4 mt-auto space-y-2">
        <div className="p-3 bg-surface rounded-lg border border-outline-variant/30">
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${isGuest ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></div>
            <div className="text-[11px] font-bold text-on-surface truncate">{userEmail}</div>
          </div>
          <div className="text-[10px] text-on-surface-variant font-mono truncate">
            UID: {deviceId ? `${deviceId.slice(0, 10)}...` : 'Chưa kết nối'}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-error hover:bg-error-container/50 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          <span>{isGuest ? 'Thoát Chế Độ Khách' : 'Đăng xuất'}</span>
        </button>
      </div>
    </nav>
  );
}