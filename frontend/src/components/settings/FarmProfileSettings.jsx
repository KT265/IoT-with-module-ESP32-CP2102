import React from 'react';

export default function FarmProfileSettings({ formData, onChange }) {
  return (
    <div className="bg-white rounded-xl p-6 md:p-8 ambient-shadow border border-outline-variant/30">
      <div className="flex items-center gap-3 mb-6 border-b border-outline-variant pb-4">
        <span className="material-symbols-outlined text-primary fill">agriculture</span>
        <h3 className="text-xl font-bold text-on-surface">Farm Profile</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="crop_type">
            Crop Type (Loại cây trồng)
          </label>
          <input
            id="crop_type"
            name="crop_type"
            type="text"
            value={formData.crop_type || ''}
            onChange={onChange}
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="growth_stage">
            Growth Stage (Giai đoạn)
          </label>
          <select
            id="growth_stage"
            name="growth_stage"
            value={formData.growth_stage || 'Nuôi trái / Thu hoạch'}
            onChange={onChange}
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          >
            <option value="Cây con / Ươm mầm">Germination (Cây con)</option>
            <option value="Phát triển thân lá">Tillering (Phát triển nhánh lá)</option>
            <option value="Ra hoa / Thụ phấn">Heading (Ra hoa / Thụ phấn)</option>
            <option value="Nuôi trái / Thu hoạch">Ripening (Nuôi trái / Thu hoạch)</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="country">
            Country (Quốc gia)
          </label>
          <select
            id="country"
            name="country"
            value={formData.country || 'Vietnam'}
            onChange={onChange}
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          >
            <option value="Vietnam">Vietnam</option>
            <option value="Thailand">Thailand</option>
            <option value="Cambodia">Cambodia</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface-variant" htmlFor="local_area">
            Local Area (Địa phương)
          </label>
          <input
            id="local_area"
            name="local_area"
            type="text"
            value={formData.local_area || ''}
            onChange={onChange}
            placeholder="e.g. Lâm Đồng, Việt Nam"
            className="rounded-lg border-outline-variant bg-surface-container-low text-on-surface focus:border-primary focus:ring-primary px-4 py-3 text-sm"
          />
        </div>
      </div>
    </div>
  );
}