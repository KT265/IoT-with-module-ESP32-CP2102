import React from 'react';

export default function ForecastTable({ forecastList }) {
  // Hàm chuyển YYYY-MM-DD sang định dạng Thứ, Ngày/Tháng
  const formatDateLabel = (dateStr, index) => {
    if (index === 0) return 'Hôm nay (' + dateStr.split('-').slice(1).reverse().join('/') + ')';
    try {
      const d = new Date(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getDay()];
      const formatted = dateStr.split('-').slice(1).reverse().join('/');
      return `${dayName}, ${formatted}`;
    } catch {
      return dateStr;
    }
  };

  // Chọn icon phù hợp với thời tiết OWM
  const getWeatherIcon = (mainWeather, status) => {
    const s = (status + ' ' + (mainWeather || '')).toLowerCase();
    if (s.includes('mưa') || s.includes('rain') || s.includes('drizzle')) {
      return { icon: 'rainy', color: 'text-primary' };
    }
    if (s.includes('dông') || s.includes('thunder')) {
      return { icon: 'thunderstorm', color: 'text-tertiary' };
    }
    if (s.includes('mây') || s.includes('cloud')) {
      return { icon: 'partly_cloudy_day', color: 'text-secondary' };
    }
    return { icon: 'sunny', color: 'text-amber-500' };
  };

  if (!forecastList || forecastList.length === 0) {
    return (
      <div className="bg-surface rounded-xl ambient-shadow p-8 border border-outline-variant/30 text-center">
        <span className="material-symbols-outlined text-4xl text-outline animate-spin">sync</span>
        <p className="text-sm text-on-surface-variant mt-2">Đang đồng bộ dự báo thời tiết thực tế từ OpenWeatherMap...</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl ambient-shadow overflow-hidden border border-outline-variant/30">
      <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-white">
        <h3 className="text-base font-semibold text-on-surface">Dự Báo Thời Tiết 5 - 7 Ngày Tới (OpenWeatherMap)</h3>
        <span className="material-symbols-outlined text-on-surface-variant">calendar_month</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-xs text-on-surface-variant uppercase tracking-wider">
              <th className="p-4 font-semibold">Thời Gian</th>
              <th className="p-4 font-semibold">Tình Trạng</th>
              <th className="p-4 font-semibold">Nhiệt Độ (Max/Min)</th>
              <th className="p-4 font-semibold">Độ Ẩm TB</th>
              <th className="p-4 font-semibold">Tốc Độ Gió</th>
              <th className="p-4 font-semibold">Lượng Mưa Dự Báo</th>
            </tr>
          </thead>
          <tbody className="text-sm text-on-surface divide-y divide-outline-variant/20">
            {forecastList.map((row, idx) => {
              const { icon, color } = getWeatherIcon(row.main_weather, row.status);
              return (
                <tr key={idx} className="hover:bg-surface-variant/40 transition-colors">
                  <td className="p-4 font-medium">{formatDateLabel(row.date, idx)}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className={`material-symbols-outlined ${color}`}>{icon}</span>
                      <span>{row.status}</span>
                    </div>
                  </td>
                  <td className="p-4 font-mono">{row.temp_range}</td>
                  <td className="p-4">{row.humidity}</td>
                  <td className="p-4">{row.wind}</td>
                  <td className="p-4 font-semibold text-primary">{row.rainfall}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}