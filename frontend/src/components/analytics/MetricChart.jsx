import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

export default function MetricChart({ title, value, trend, icon, color, dataPoints, labels, unit }) {
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 160);
    gradient.addColorStop(0, `${color}33`);
    gradient.addColorStop(1, `${color}00`);

    // Nếu chưa có dữ liệu 5 phút nào trong ngày, tạo mảng rỗng để vẽ trục
    const chartLabels = (labels && labels.length > 0) ? labels : ['00:00'];
    const chartData = (dataPoints && dataPoints.length > 0) ? dataPoints : [0];

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            data: chartData,
            borderColor: color,
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            borderWidth: 2.5,
            pointRadius: chartData.length > 30 ? 0 : 2, // Ẩn chấm tròn khi điểm dày để mượt
            pointHoverRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.raw} ${unit || ''}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 8, // Giới hạn mốc giờ hiển thị để không đè chữ nhau
              font: { size: 10, family: 'Inter' },
              color: '#707973'
            }
          },
          y: {
            display: false,
            suggestedMin: 0
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [dataPoints, labels, color, unit]);

  return (
    <div className="bg-surface rounded-xl ambient-shadow p-5 flex flex-col border border-transparent hover:border-primary/20 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase">{title}</h3>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-2xl font-bold text-on-surface">{value}</span>
            <span className="text-xs text-primary flex items-center font-medium">{trend}</span>
          </div>
        </div>
        <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
      </div>
      <div className="w-full h-44">
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}