
import React from 'react';
import { Screen } from '../types';

interface TopHeaderProps {
  showLogo: boolean;
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({ showLogo, currentScreen, onNavigate, onLogout }) => {
  return (
    <header className="w-full bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showLogo ? (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate(Screen.DATA_GRID)}>
              <div className="text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">TaxFlow</h1>
            </div>
          ) : (
            <div className="flex items-center gap-9">
              <nav className="hidden md:flex items-center gap-9">
                <button onClick={() => onNavigate(Screen.DATA_GRID)} className={`text-sm font-medium transition-colors ${currentScreen === Screen.DATA_GRID ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-primary'}`}>Мой Склад</button>
                <button onClick={() => onNavigate(Screen.NEW_INVOICE)} className={`text-sm font-medium transition-colors ${currentScreen === Screen.NEW_INVOICE ? 'text-primary font-bold' : 'text-slate-600 dark:text-slate-300 hover:text-primary'}`}>Реализация</button>
                <button className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors">Приобретение</button>
                <button className="text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-primary transition-colors">Отчеты</button>
              </nav>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
            title="Выйти"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium border border-primary/20">
            <span className="material-symbols-outlined text-xl">person</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
