
export function MobileBottomNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'analytics', label: 'Analytics', icon: 'insights' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  return (
    <nav className="md:hidden flex justify-between items-center px-4 w-full h-16 bg-surface border-t border-outline-variant/30 fixed bottom-0 z-50">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center w-full ${
              isActive ? 'text-primary' : 'text-on-surface-variant opacity-70'
            }`}
          >
            <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill' : ''}`}>
              {tab.icon}
            </span>
            <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}