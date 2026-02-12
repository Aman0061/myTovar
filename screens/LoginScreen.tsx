
import React, { useState } from 'react';
import Logo from '../components/Logo';

interface LoginScreenProps {
  onLogin: (login: string, password: string) => string | null | Promise<string | null>;
  onNavigateToRegister: () => void;
}

const features = [
  'Автоматизация отчётности',
  'Учёт налогообложения',
  'Синхронизация с ГНС',
  'Простой интерфейс',
];

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
    <div className="min-h-screen flex bg-slate-50">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(36,99,235,0.06)_0%,transparent_50%)]" />
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(rgba(36,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(36,99,235,0.04) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative flex flex-col justify-center px-12 xl:px-20 py-16">
          <Logo className="h-14 w-auto object-contain mb-10" />
          <h1 className="text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Начни управлять
            <br />
            <span className="text-primary">бизнесом</span>
          </h1>
          <p className="mt-6 text-slate-600 text-base max-w-sm leading-relaxed">
            Система учёта налогов и складского управления. Ведите документацию, формируйте отчёты и держите всё под контролем.
          </p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                <span className="text-slate-700 font-medium text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col px-6 py-12 lg:px-12 xl:px-20 bg-slate-50 overflow-auto">
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8">
            <Logo className="h-12 w-auto object-contain" />
          </div>
          <h2 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">Войти в аккаунт</h2>


          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Логин или e-mail</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                  placeholder="admin или example@mail.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Пароль</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
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
              className="w-full bg-primary hover:bg-blue-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.99] flex items-center justify-center gap-2 text-base"
            >
              {isLoading ? (
                <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Войти</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
            <p className="mt-2 text-slate-500 text-sm">
              Нет аккаунта?{' '}
              <button onClick={onNavigateToRegister} className="text-primary font-bold underline underline-offset-2 hover:text-blue-600 transition-colors">
                Создать
              </button>
            </p>
          </form>

          <p className="mt-8 text-slate-500 text-xs leading-relaxed">
            Входя в систему, вы принимаете{' '}
            <a href="#" className="text-primary underline underline-offset-2 hover:text-blue-600">Правила</a>
            {' '}и{' '}
            <a href="#" className="text-primary underline underline-offset-2 hover:text-blue-600">Политику</a>.
          </p>
          </div>
        </div>

        <p className="pt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
          © 2026 MyBusiness
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
