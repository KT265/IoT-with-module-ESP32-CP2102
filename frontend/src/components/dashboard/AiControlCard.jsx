import React, { useState, useRef } from 'react';

export default function AiControlCard({ aiDecision, aiModel, onTriggerAi, soilValue, isGuest }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Vui lòng chỉ chọn file hình ảnh (JPG, PNG, WebP)!');
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRunAnalysis = () => {
    onTriggerAi(selectedImage);
  };

  return (
    <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-6 border border-outline-variant/30 flex flex-col justify-between min-h-[380px]">
      {/* HEADER CARD */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl">smart_toy</span>
          <h3 className="text-xl font-bold text-on-surface">AI Control Logic</h3>
        </div>
        <span className="text-xs font-mono bg-white px-2.5 py-1 rounded border text-on-surface-variant font-semibold shadow-sm">
          {aiModel || 'gemini-3.6-flash'}
        </span>
      </div>

      <div className="flex-1 bg-surface-container-lowest rounded-lg p-5 md:p-6 border border-outline-variant/50 ambient-shadow relative overflow-hidden flex flex-col justify-between space-y-4">
        <div>
          {/* TRẠNG THÁI ACTIVE */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Active Agro-Vision Analysis
              </span>
            </div>

            {/* Ô TẢI ẢNH CHẨN ĐOÁN BỆNH */}
            {!isGuest && (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageChange}
                  className="hidden"
                />
                {!previewUrl ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_a_photo</span>
                    <span>Tải ảnh bệnh cây</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-surface-container-low p-1 pr-2 rounded-lg border border-outline-variant/50">
                    <img
                      src={previewUrl}
                      alt="Crop preview"
                      className="w-7 h-7 object-cover rounded shadow-sm"
                    />
                    <span className="text-[11px] text-on-surface font-medium truncate max-w-[100px]">
                      {selectedImage?.name}
                    </span>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-error hover:opacity-75"
                      title="Xóa ảnh"
                    >
                      <span className="material-symbols-outlined text-[16px]">cancel</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 1. KHUNG HIỂN THỊ CHẨN ĐOÁN BỆNH (NẾU CÓ PHÂN TÍCH TỪ ẢNH) */}
          {aiDecision?.plant_disease && (
            <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <span className="material-symbols-outlined text-rose-600 text-[20px]">medical_services</span>
                <span>Bác sĩ Cây trồng Chẩn đoán: {aiDecision.plant_disease}</span>
              </div>
              {aiDecision.disease_treatment && (
                <p className="text-xs text-rose-800 leading-relaxed pl-7">
                  <strong>Phác đồ điều trị:</strong> {aiDecision.disease_treatment}
                </p>
              )}
            </div>
          )}

          {/* 2. TRẠNG THÁI HIỆN TẠI */}
          <p className="text-sm md:text-base text-on-surface-variant leading-relaxed">
            <strong className="text-on-surface font-semibold">Trạng thái: </strong>
            {aiDecision?.status_summary || (
              <>
                Độ ẩm đất đang ở mức <span className="text-tertiary font-bold">{soilValue}%</span>. Hệ thống đang sẵn sàng cho chu trình tưới thông minh.
              </>
            )}
          </p>

          {/* 3. QUYẾT ĐỊNH HÀNH ĐỘNG CỦA AI */}
          <div className="p-3.5 bg-primary-container/10 border-l-4 border-primary rounded-r-md mt-3">
            <p className="text-on-surface text-xs md:text-sm leading-relaxed">
              <strong className="font-semibold block mb-1">Quyết định AI:</strong>
              {aiDecision?.ai_action ||
                'Kích hoạt bơm tưới nhấp nhả an toàn 5s để đưa ẩm đất về ngưỡng mục tiêu 60%.'}
            </p>
          </div>

          {/* 4. CẢNH BÁO SINH HỌC & DỊCH BỆNH DỰ BÁO */}
          {aiDecision?.disease_warning && (
            <div className="mt-3 text-xs text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
              <strong>Cảnh báo sinh học:</strong> {aiDecision.disease_warning}
            </div>
          )}
        </div>

        {/* NÚT KÍCH HOẠT PHÂN TÍCH */}
        <div className="mt-4 flex justify-between items-center pt-2 border-t border-outline-variant/20">
          <div className="text-[11px] text-outline italic">
            {selectedImage ? '💡 Đã đính kèm ảnh bệnh để AI Vision soi lá/thân cây' : '💡 Chưa đính kèm ảnh: AI phân tích theo vi khí hậu & thời tiết'}
          </div>
          {!isGuest && (
            <button
              onClick={handleRunAnalysis}
              className="text-xs font-bold text-primary hover:text-primary-container flex items-center gap-1.5 transition-colors bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              <span>{selectedImage ? 'Chẩn đoán bệnh & Tối ưu' : 'Tái phân tích ngay'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}