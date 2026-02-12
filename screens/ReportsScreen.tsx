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
import type { RealizationRecord, TaxEntry } from '../types';

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

const MONTH_NAMES = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const COLORS = ['#2563EB', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

interface ReportsScreenProps {
  realizations: RealizationRecord[];
  taxEntries: TaxEntry[];
}

const formatMoney = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });

const ReportsScreen: React.FC<ReportsScreenProps> = ({ realizations, taxEntries }) => {
  const { revenue, expenses, grossProfit, avgCheck, count } = useMemo(() => {
    const rev = realizations.reduce((s, r) => s + (r.total ?? 0), 0);
    const exp = taxEntries.reduce((s, e) => s + (e.total ?? e.quantity * e.price), 0);
    return {
      revenue: rev,
      expenses: exp,
      grossProfit: rev - exp,
      avgCheck: realizations.length > 0 ? rev / realizations.length : 0,
      count: realizations.length
    };
  }, [realizations, taxEntries]);

  const kpiCards = useMemo(
    () => [
      { label: 'Выручка', value: `${formatMoney(revenue)} сом`, sub: '' },
      { label: 'Расходы', value: `${formatMoney(expenses)} сом`, sub: '' },
      { label: 'Валовая прибыль', value: `${formatMoney(grossProfit)} сом`, sub: '' },
      { label: 'Средний чек', value: `${formatMoney(avgCheck)} сом`, sub: '' },
      { label: 'Реализации', value: count.toString(), sub: '' }
    ],
    [revenue, expenses, grossProfit, avgCheck, count]
  );

  const lineData = useMemo(() => {
    const byMonth: Record<number, number> = {};
    for (let i = 0; i < 12; i++) byMonth[i] = 0;
    const now = new Date();
    const year = now.getFullYear();
    realizations.forEach((r) => {
      const d = r.issueDate || r.createdAt || r.deliveryDate;
      if (!d) return;
      const m = new Date(d).getMonth();
      const y = new Date(d).getFullYear();
      if (y === year) byMonth[m] += r.total ?? 0;
    });
    const data = Array.from({ length: 12 }, (_, i) => Math.round(byMonth[i] / 1000));
    return {
      labels: MONTH_NAMES,
      datasets: [
        {
          label: 'Выручка (тыс. сом)',
          data,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          tension: 0.35,
          fill: true,
          pointRadius: 3
        }
      ]
    };
  }, [realizations]);

  const doughnutData = useMemo(() => {
    const byClient: Record<string, number> = {};
    realizations.forEach((r) => {
      const k = r.counterparty || 'Без контрагента';
      byClient[k] = (byClient[k] ?? 0) + (r.total ?? 0);
    });
    const entries = Object.entries(byClient).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: entries.map(([l]) => l),
      datasets: [
        {
          label: 'Доля',
          data: entries.map(([, v]) => v),
          backgroundColor: COLORS.slice(0, entries.length),
          borderWidth: 0
        }
      ]
    };
  }, [realizations]);

  const barData = useMemo(() => {
    const byProduct: Record<string, number> = {};
    realizations.forEach((r) => {
      (r.items ?? []).forEach((item) => {
        const k = item.name || 'Товар';
        const sum = (item.price ?? 0) * (item.quantity ?? 0);
        byProduct[k] = (byProduct[k] ?? 0) + sum;
      });
    });
    const entries = Object.entries(byProduct).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: entries.map(([l]) => l.length > 20 ? l.slice(0, 18) + '…' : l),
      datasets: [
        {
          label: 'Оборот (сом)',
          data: entries.map(([, v]) => Math.round(v / 1000)),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderRadius: 8
        }
      ]
    };
  }, [realizations]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context: { parsed?: { y?: number } | number }) => {
              const val = typeof context.parsed === 'number' ? context.parsed : (context.parsed?.y ?? 0);
              return `${Number(val).toLocaleString()} тыс. сом`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v: number) => `${v}` } }
      }
    }),
    []
  );

  const recentRows = useMemo(
    () =>
      realizations
        .slice(0, 10)
        .map((r) => ({
          id: r.id.slice(0, 8),
          date: (r.issueDate || r.deliveryDate || r.createdAt || '').slice(0, 10),
          client: r.counterparty || '—',
          amount: `${formatMoney(r.total ?? 0)} сом`
        })),
    [realizations]
  );

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
            {card.sub && <p className="text-xs text-emerald-600 font-bold mt-1">{card.sub}</p>}
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
            <span className="text-xs font-bold text-slate-400">все время</span>
          </div>
          <div className="h-[260px]">
            {doughnutData.datasets[0].data.length > 0 ? (
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">Нет данных</div>
            )}
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
            {barData.datasets[0].data.length > 0 ? (
              <Bar data={barData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">Нет данных</div>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Последние реализации</h3>
            <span className="text-xs font-bold text-slate-400">последние 10</span>
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
                {recentRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-sm font-bold">
                      Нет реализаций
                    </td>
                  </tr>
                ) : (
                  recentRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-4 text-xs text-slate-500 font-bold">{row.id}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400 font-bold">{row.date}</td>
                    <td className="py-3 px-4 text-sm font-black text-slate-900 dark:text-white">{row.client}</td>
                    <td className="py-3 px-4 text-sm font-black text-slate-900 dark:text-white text-right">{row.amount}</td>
                  </tr>
                ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportsScreen;
