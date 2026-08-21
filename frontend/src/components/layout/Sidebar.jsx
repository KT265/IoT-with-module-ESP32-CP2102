import React from 'react';

export default function Sidebar({ activeTab, setActiveTab, deviceId }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'analytics', label: 'Analytics & Forecast', icon: 'insights' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <nav className="hidden md:flex flex-col py-8 bg-surface-container-low shadow-md h-screen w-64 sticky top-0 z-30 flex-shrink-0">
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold text-primary tracking-tight">AgroLogic</h1>
        <p className="text-xs text-on-surface-variant font-medium">Smart Farming</p>
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

      <div className="px-6 mt-auto">
        <div className="p-3 bg-surface rounded-lg border border-outline-variant/30 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div className="text-xs text-on-surface-variant truncate font-mono">
            {deviceId || 'No Device'}
          </div>
        </div>
      </div>
    </nav>
  );
}