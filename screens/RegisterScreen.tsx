
import React, { useState } from 'react';
import { CompanyInfo } from '../types';
import Logo from '../components/Logo';

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegisterSuccess: (email: string, password: string, company: CompanyInfo) => Promise<string | null>;
}

type Step = 1 | 2;

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[45%] h-[45%] bg-primary/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-xl relative">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 md:p-6 backdrop-blur-sm">
          
          <div className="flex flex-col items-center mb-4">
            <Logo className="h-12 w-auto object-contain mb-3" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Регистрация</h1>
            <div className="flex items-center gap-2 mt-3">
              <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-primary' : 'w-3 bg-slate-200 dark:bg-slate-800'}`}></div>
              <div className={`h-1.5 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-primary' : 'w-3 bg-slate-200 dark:bg-slate-800'}`}></div>
            </div>
            <p className="text-slate-500 font-bold text-[10px] mt-1.5 uppercase tracking-widest">
              {step === 1 ? 'Шаг 1: Учетные данные' : 'Шаг 2: Данные компании'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">mail</span>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Пароль</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">lock</span>
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Повторите пароль</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-lg">lock</span>
                  <input 
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  <span>Далее</span>
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
                <button 
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full text-slate-400 hover:text-slate-600 font-bold py-1.5 transition-colors text-xs"
                >
                  Уже есть аккаунт? Войти
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCompleteRegistration} className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ФИО</label>
                <input 
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                  placeholder="Иванов Иван Иванович"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Тип</label>
                  <select 
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value as CompanyInfo['type'])}
                    className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-bold transition-all appearance-none text-sm"
                  >
                    <option value="ИП">ИП</option>
                    <option value="ОсОО">ОсОО</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ИНН</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    maxLength={14}
                    required
                    value={inn}
                    onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                    placeholder="14 цифр"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Юридический адрес</label>
                <input 
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                  placeholder="Город, улица, дом"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Расчетный счет</label>
                <input 
                  type="text"
                  required
                  value={settlementAccount}
                  onChange={(e) => setSettlementAccount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                  placeholder="11800000..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Банк</label>
                  <input 
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                    placeholder="Оптима Банк"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">БИК</label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={bik}
                    onChange={(e) => setBik(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-3 py-2.5 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                    placeholder="6 цифр"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                  <span className="material-symbols-outlined text-base">error</span>
                  {error}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button 
                  type="button"
                  onClick={() => { setStep(1); setError(''); }}
                  className="flex-1 border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-black py-2.5 rounded-xl transition-all active:scale-95 text-sm"
                >
                  Назад
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-primary hover:bg-blue-700 text-white font-black py-2.5 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Завершить</span>
                      <span className="material-symbols-outlined text-lg">verified</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 flex items-start gap-2">
            <span className="material-symbols-outlined text-primary text-base">security</span>
            <p className="text-[9px] text-slate-500 leading-snug font-medium">
              Нажимая «Завершить», вы подтверждаете согласие с правилами сервиса и обработкой персональных данных.
            </p>
          </div>
        </div>
        
        <p className="text-center mt-4 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
          © 2024 TAXFLOW ENTERPRISE SOLUTIONS
        </p>
      </div>
    </div>
  );
};

export default RegisterScreen;
