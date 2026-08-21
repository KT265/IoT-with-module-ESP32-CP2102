// src/components/dashboard/AiControlCard.jsx
import React from 'react';

export default function AiControlCard({ aiDecision, aiModel, onTriggerAi, soilValue }) {
  return (
    <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex flex-col min-h-[300px]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          <h3 className="text-xl font-bold text-on-surface">AI Control Logic</h3>
        </div>
        <span className="text-xs font-mono bg-white px-2 py-1 rounded border text-on-surface-variant">
          {aiModel || 'gemini-2.0-flash'}
        </span>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-lg p-6 border border-outline-variant/50 ambient-shadow relative overflow-hidden flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Active Analysis
            </span>
          </div>

          <p className="text-base text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface font-semibold">Trạng thái: </strong>
            {aiDecision?.status_summary || (
              <>
                Độ ẩm đất tại Zone Alpha đang ở mức{' '}
                <span className="text-tertiary font-bold">{soilValue}%</span>. Hệ thống sẵn sàng bù ẩm.
              </>
            )}
          </p>

          <div className="p-4 bg-primary-container/10 border-l-4 border-primary rounded-r-md mt-4">
            <p className="text-on-surface text-sm">
              <strong className="font-semibold block mb-1">Quyết định AI:</strong>
              {aiDecision?.ai_action ||
                'Kích hoạt bơm tưới nhấp nhả an toàn 5s để đưa ẩm đất về ngưỡng mục tiêu 60%.'}
            </p>
          </div>

          {aiDecision?.disease_warning && (
            <div className="mt-3 text-xs text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
              <strong>⚠️ Cảnh báo sinh học:</strong> {aiDecision.disease_warning}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onTriggerAi}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span> Tái phân tích ngay
          </button>
        </div>
      </div>
    </div>
  );
}