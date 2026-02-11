import React, { useEffect, useMemo, useState } from 'react';
import { TaxEntry } from '../types';
import { toast } from 'react-hot-toast';

interface ArchiveScreenProps {
  entries: TaxEntry[];
  onEntriesUpdated: (entries: TaxEntry[]) => void;
}

const ArchiveScreen: React.FC<ArchiveScreenProps> = ({ entries, onEntriesUpdated }) => {
  const archivedEntries = useMemo(
    () => entries.filter((entry) => entry.archived),
    [entries]
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    action: (() => void) | null;
  } | null>(null);

  const handleRestore = (id: string) => {
    setConfirmState({
      title: 'Вернуть товар',
      message: 'Товар будет возвращен в активные.',
      action: () => {
        const next = entries.map((entry) =>
          entry.id === id ? { ...entry, archived: false } : entry
        );
        onEntriesUpdated(next);
        toast.success('Товар восстановлен');
      }
    });
  };

  const handleDelete = (id: string) => {
    setConfirmState({
      title: 'Удалить товар',
      message: 'Товар будет удален без возможности восстановления.',
      action: () => {
        const next = entries.filter((entry) => entry.id !== id);
        onEntriesUpdated(next);
        toast.success('Товар удален');
      }
    });
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        openMenuId &&
        !(event.target as HTMLElement).closest('[data-archive-menu]')
      ) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [openMenuId]);

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Архив товаров</h2>
          <nav className="flex items-center text-xs text-slate-500 gap-2 font-bold">
            <span className="hover:text-primary cursor-pointer transition-colors">Главная</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">Архив</span>
          </nav>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-hidden min-h-[320px]">
          {archivedEntries.length > 0 ? (
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="px-5 py-3 w-[130px] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Дата поступл.</th>
                  <th className="px-5 py-3 w-[220px] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Поставщик</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Наименование товара</th>
                  <th className="px-5 py-3 w-[110px] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Остаток</th>
                  <th className="px-5 py-3 w-[120px] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Цена зак.</th>
                  <th className="px-5 py-3 w-[120px] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Сумма</th>
                  <th className="px-5 py-3 w-[170px] text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {archivedEntries.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-500 font-bold tabular-nums">{item.date}</td>
                    <td className="px-5 py-3 text-sm font-black text-slate-900 dark:text-white">
                      <span className="truncate block w-full" title={item.supplier}>{item.supplier}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">
                      <span className="block w-full font-medium whitespace-normal break-words" title={item.product}>
                        {item.product}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums font-bold">{item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400 text-right tabular-nums font-bold">{item.price.toLocaleString()}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-black text-slate-900 dark:text-white text-right tabular-nums">
                      {(item.total).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <div className="relative inline-flex" data-archive-menu>
                        <button
                          onClick={() => setOpenMenuId((prev) => (prev === item.id ? null : item.id))}
                          className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Действия"
                        >
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                        {openMenuId === item.id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                            <button
                              onClick={() => handleRestore(item.id)}
                              className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">undo</span>
                              Вернуть
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                              Удалить
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="material-symbols-outlined text-6xl text-slate-200 mb-4">inventory</span>
              <p className="text-slate-500 font-bold">Архив пуст</p>
            </div>
          )}
        </div>
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">{confirmState.title}</h3>
              <p className="text-xs text-slate-500 font-bold mt-1">{confirmState.message}</p>
            </div>
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const action = confirmState.action;
                  setConfirmState(null);
                  action?.();
                }}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black shadow-lg"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArchiveScreen;
