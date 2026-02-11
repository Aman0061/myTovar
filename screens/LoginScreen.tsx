
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (login: string, password: string) => string | null | Promise<string | null>;
  onNavigateToRegister: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onNavigateToRegister }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const errorMessage = await Promise.resolve(onLogin(username, password));
      if (errorMessage) setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md relative">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-10 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-10">
            <div className="size-16 bg-primary rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-primary/30">
              <span className="material-symbols-outlined text-4xl">account_balance</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">TaxFlow</h1>
            <p className="text-slate-500 font-bold text-sm mt-2">Система управления налогами</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Логин</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                <input 
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                  placeholder="admin"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Пароль</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-3 text-lg"
            >
              {isLoading ? (
                <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Войти в систему</span>
                  <span className="material-symbols-outlined">login</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-10 flex flex-col items-center gap-4">
            <button 
              onClick={onNavigateToRegister}
              className="text-primary hover:text-blue-700 text-sm font-black transition-colors"
            >
              Создать новый аккаунт
            </button>
            <div className="h-px bg-slate-100 dark:bg-slate-800 w-full"></div>
            <p className="text-slate-500 text-xs font-medium text-center leading-relaxed">
              Используйте тестовые данные:<br/>
              Логин: <span className="font-bold text-slate-900 dark:text-white">admin</span> / Пароль: <span className="font-bold text-slate-900 dark:text-white">admin</span>
            </p>
          </div>
        </div>
        
        <p className="text-center mt-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
          © 2024 TAXFLOW ENTERPRISE SOLUTIONS
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
