import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const ReportsScreen: React.FC = () => {
  const kpiCards = useMemo(
    () => [
      { label: 'Выручка', value: '3 240 000 сом', sub: '+12% за мес.' },
      { label: 'Расходы', value: '1 420 000 сом', sub: '-4% за мес.' },
      { label: 'Валовая прибыль', value: '1 820 000 сом', sub: '+8% за мес.' },
      { label: 'Средний чек', value: '24 600 сом', sub: '+5% за мес.' },
      { label: 'Реализации', value: '132', sub: '+9% за мес.' }
    ],
    []
  );

  const revenueLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const revenueData = [210, 260, 240, 280, 310, 350, 340, 360, 390, 420, 410, 450];

  const lineData = {
    labels: revenueLabels,
    datasets: [
      {
        label: 'Выручка (тыс. сом)',
        data: revenueData,
        borderColor: '#2563EB',
        backgroundColor: 'rgba(37, 99, 235, 0.15)',
        tension: 0.35,
        fill: true,
        pointRadius: 3
      }
    ]
  };

  const barData = {
    labels: ['Цемент', 'Гипс', 'Штукатурка', 'Краска', 'Лента', 'Грунтовка'],
    datasets: [
      {
        label: 'Оборот (тыс. сом)',
        data: [420, 360, 300, 280, 240, 190],
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderRadius: 8
      }
    ]
  };

  const doughnutData = {
    labels: ['ОсОО Технопром', 'ИП Иванов', 'ОсОО Альфа', 'ОсОО Строймаркет'],
    datasets: [
      {
        label: 'Доля',
        data: [35, 25, 22, 18],
        backgroundColor: ['#2563EB', '#22C55E', '#F59E0B', '#8B5CF6'],
        borderWidth: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.parsed.y ?? context.parsed} тыс. сом`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (value: number) => `${value}` }
      }
    }
  } as const;

  const recentRows = [
    { id: 'R-2401', date: '08.02.2026', client: 'ОсОО Технопром', amount: '86 200 сом' },
    { id: 'R-2399', date: '07.02.2026', client: 'ИП Иванов', amount: '42 500 сом' },
    { id: 'R-2397', date: '06.02.2026', client: 'ОсОО Альфа', amount: '64 300 сом' },
    { id: 'R-2396', date: '05.02.2026', client: 'ОсОО Строймаркет', amount: '28 100 сом' }
  ];

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-5 gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Отчеты</h2>
          <nav className="flex items-center text-xs text-slate-500 gap-2 font-bold">
            <span className="hover:text-primary cursor-pointer transition-colors">Главная</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">Отчеты</span>
          </nav>
        </div>
        <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-sm transition-all hover:border-primary hover:text-primary">
          <span className="material-symbols-outlined text-xl">download</span>
          Экспорт отчета
        </button>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{card.label}</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">{card.value}</p>
            <p className="text-xs text-emerald-600 font-bold mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Выручка по месяцам</h3>
            <span className="text-xs font-bold text-slate-400">2026</span>
          </div>
          <div className="h-[260px]">
            <Line data={lineData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Доли по контрагентам</h3>
            <span className="text-xs font-bold text-slate-400">текущий квартал</span>
          </div>
          <div className="h-[260px]">
            <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Топ товары</h3>
            <span className="text-xs font-bold text-slate-400">за месяц</span>
          </div>
          <div className="h-[260px]">
            <Bar data={barData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Последние реализации</h3>
            <span className="text-xs font-bold text-slate-400">моки</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Дата</th>
                  <th className="py-3 px-4">Контрагент</th>
                  <th className="py-3 px-4 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/30">
                    <td className="py-3 px-4 text-xs text-slate-500 font-bold">{row.id}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 font-bold">{row.date}</td>
                    <td className="py-3 px-4 text-sm font-black text-slate-900 dark:text-white">{row.client}</td>
                    <td className="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* TODO: заменить мок на API */}
    </div>
  );
};

export default ReportsScreen;
