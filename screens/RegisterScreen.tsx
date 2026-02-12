
import React, { useState } from 'react';
import { CompanyInfo } from '../types';
import Logo from '../components/Logo';

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegisterSuccess: (email: string, password: string, company: CompanyInfo) => Promise<string | null>;
}

type Step = 1 | 2;

const features = [
  'Автоматизация отчётности',
  'Учёт налогообложения',
  'Синхронизация с ГНС',
  'Простой интерфейс',
];

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onBackToLogin, onRegisterSuccess }) => {
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 Data
  const [fullName, setFullName] = useState('');
  const [companyType, setCompanyType] = useState<CompanyInfo['type']>('ИП');
  const [inn, setInn] = useState('');
  const [address, setAddress] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bik, setBik] = useState('');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const innDigits = inn.replace(/\D/g, '');
    const bikDigits = bik.replace(/\D/g, '');
    if (innDigits.length !== 14) {
      setError('ИНН должен содержать 14 цифр');
      return;
    }
    if (bikDigits.length !== 6) {
      setError('БИК должен содержать 6 цифр');
      return;
    }
    setIsLoading(true);

    const companyData: CompanyInfo = {
      type: companyType,
      inn,
      address,
      account: settlementAccount,
      bankName,
      bik,
      name: fullName.trim() || email.split('@')[0] || email
    };

    try {
      const errorMessage = await onRegisterSuccess(email, password, companyData);
      if (errorMessage) {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#fafafb]">
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
              <div key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#fafafb] border border-slate-200 shadow-sm">
                <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
                <span className="text-slate-700 font-medium text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex flex-col px-6 py-12 lg:px-12 xl:px-20 bg-[#fafafb] overflow-auto">
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto">
            <div className="lg:hidden mb-8">
              <Logo className="h-12 w-auto object-contain" />
            </div>
            <h2 className="text-2xl xl:text-3xl font-black text-slate-900 tracking-tight">Регистрация</h2>
            <div className="flex items-center gap-2 mt-4">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-primary' : 'w-3 bg-slate-200'}`}></div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-primary' : 'w-3 bg-slate-200'}`}></div>
            </div>
            <p className="text-slate-500 font-bold text-[10px] mt-1.5 uppercase tracking-widest">
              {step === 1 ? 'Шаг 1: Учетные данные' : 'Шаг 2: Данные компании'}
            </p>

            {step === 1 ? (
              <form onSubmit={handleNextStep} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">E-mail</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                      placeholder="example@mail.com"
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

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Повторите пароль</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                  className="w-full bg-primary hover:bg-blue-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.99] flex items-center justify-center gap-2 text-base"
                >
                  <span>Далее</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <p className="mt-2 text-slate-500 text-sm">
                  Уже есть аккаунт?{' '}
                  <button onClick={onBackToLogin} className="text-primary font-bold underline underline-offset-2 hover:text-blue-600 transition-colors">
                    Войти
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleCompleteRegistration} className="mt-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">ФИО</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                    placeholder="Иванов Иван Иванович"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Тип</label>
                    <select
                      value={companyType}
                      onChange={(e) => setCompanyType(e.target.value as CompanyInfo['type'])}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-primary/30 focus:border-primary font-bold transition-all appearance-none"
                    >
                      <option value="ИП">ИП</option>
                      <option value="ОсОО">ОсОО</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">ИНН</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={14}
                      required
                      value={inn}
                      onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 14))}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                      placeholder="14 цифр"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Юридический адрес</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                    placeholder="Город, улица, дом"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Расчетный счет</label>
                  <input
                    type="text"
                    required
                    value={settlementAccount}
                    onChange={(e) => setSettlementAccount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                    placeholder="11800000..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Банк</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                      placeholder="Оптима Банк"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">БИК</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={bik}
                      onChange={(e) => setBik(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary font-medium transition-all"
                      placeholder="6 цифр"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-500 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {error}
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    className="flex-1 border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-black py-3 rounded-xl transition-all active:scale-[0.99]"
                  >
                    Назад
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-[2] bg-primary hover:bg-blue-600 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Завершить</span>
                        <span className="material-symbols-outlined">verified</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 p-3 bg-white rounded-xl border border-slate-200 flex items-start gap-2">
              <span className="material-symbols-outlined text-primary text-base">security</span>
              <p className="text-xs text-slate-500 leading-snug font-medium">
                Нажимая «Завершить», вы подтверждаете согласие с правилами сервиса и обработкой персональных данных.
              </p>
            </div>
          </div>
        </div>

        {/* <p className="pt-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
          © 2026 MyBusiness
        </p> */}
      </div>
    </div>
  );
};

export default RegisterScreen;
