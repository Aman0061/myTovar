
import React from 'react';
import { Screen } from '../types';

interface SidebarProps {
  isOpen: boolean;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onToggle: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, currentScreen, onNavigate, onToggle, onLogout }) => {
  return (
    <aside className={`w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col fixed h-full z-40 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigate(Screen.DATA_GRID)}>
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div>
            <h1 className="text-slate-900 dark:text-white font-bold text-lg leading-none">НалогКонтроль</h1>
            <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-widest font-bold">ERP System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        <button 
          onClick={() => onNavigate(Screen.DATA_GRID)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentScreen === Screen.DATA_GRID ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          <span className="text-sm font-semibold">Мой Склад</span>
        </button>

        <button 
          onClick={() => onNavigate(Screen.NEW_INVOICE)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentScreen === Screen.NEW_INVOICE ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[22px]">sell</span>
          <span className="text-sm font-semibold">Реализация</span>
        </button>

        <button 
          onClick={() => onNavigate(Screen.CLIENTS)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentScreen === Screen.CLIENTS ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[22px]">group</span>
          <span className="text-sm font-semibold">Клиенты</span>
        </button>

        <button
          onClick={() => onNavigate(Screen.RETAIL)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentScreen === Screen.RETAIL ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[22px]">storefront</span>
          <span className="text-sm font-semibold">Розница</span>
        </button>

        <button className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all">
          <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
          <span className="text-sm font-semibold">Приобретение</span>
        </button>

        <button
          onClick={() => onNavigate(Screen.REPORTS)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentScreen === Screen.REPORTS ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[22px]">bar_chart</span>
          <span className="text-sm font-medium">Отчеты</span>
        </button>

        <button
          onClick={() => onNavigate(Screen.ARCHIVE)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${currentScreen === Screen.ARCHIVE ? 'bg-primary/10 text-primary shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
        >
          <span className="material-symbols-outlined text-[22px]">inventory</span>
          <span className="text-sm font-semibold">Архив товаров</span>
        </button>
      </nav>

      <div className="p-4 mt-auto border-t border-slate-200 dark:border-slate-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[22px]">settings</span>
          <span className="text-sm font-medium">Настройки</span>
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[22px]">logout</span>
          <span className="text-sm font-medium">Выйти</span>
        </button>
        <div className="mt-4 flex items-center gap-3 px-3 py-2 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
          <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden ring-2 ring-primary/20">
            <img 
              alt="User" 
              src="https://picsum.photos/seed/user123/100/100" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">Александр В.</p>
            <p className="text-[10px] text-slate-500 truncate uppercase font-bold tracking-tighter">Администратор</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
