// src/components/layout/MobileHeader.jsx
export function MobileHeader({ onTriggerAi }) {
  return (
    <header className="md:hidden w-full flex justify-between items-center px-4 h-16 shadow-sm bg-surface z-40 fixed top-0">
      <div className="text-xl font-bold text-primary">AgroLogic</div>
      <div className="flex items-center gap-3">
        <button onClick={onTriggerAi} className="p-2 rounded-full bg-primary/10 text-primary">
          <span className="material-symbols-outlined">smart_toy</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">
          AG
        </div>
      </div>
    </header>
  );
}
