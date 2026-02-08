
import React, { useState } from 'react';
import { AccountUser, CompanyInfo } from '../types';

interface RegisterScreenProps {
  onBackToLogin: () => void;
  onRegisterSuccess: (user: AccountUser) => string | null;
}

type Step = 1 | 2;

const RegisterScreen: React.FC<RegisterScreenProps> = ({ onBackToLogin, onRegisterSuccess }) => {
  const [step, setStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Data
  const [email, setEmail] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 Data
  const [companyType, setCompanyType] = useState<CompanyInfo['type']>('ИП');
  const [inn, setInn] = useState('');
  const [address, setAddress] = useState('');
  const [settlementAccount, setSettlementAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bik, setBik] = useState('');

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleCompleteRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const companyData: CompanyInfo = {
      type: companyType,
      inn,
      address,
      account: settlementAccount,
      bankName,
      bik,
      name: login
    };

    const userData: AccountUser = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      email,
      login,
      password,
      company: companyData
    };

    // Simulate API call
    setTimeout(() => {
      const errorMessage = onRegisterSuccess(userData);
      if (errorMessage) {
        setError(errorMessage);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[45%] h-[45%] bg-primary/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-xl relative">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 md:p-12 backdrop-blur-sm">
          
          <div className="flex flex-col items-center mb-10">
            <div className="size-14 bg-primary rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-primary/20">
              <span className="material-symbols-outlined text-3xl">how_to_reg</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Регистрация</h1>
            
            <div className="flex items-center gap-3 mt-6">
              <div className={`h-2 rounded-full transition-all duration-300 ${step === 1 ? 'w-12 bg-primary' : 'w-4 bg-slate-200 dark:bg-slate-800'}`}></div>
              <div className={`h-2 rounded-full transition-all duration-300 ${step === 2 ? 'w-12 bg-primary' : 'w-4 bg-slate-200 dark:bg-slate-800'}`}></div>
            </div>
            <p className="text-slate-500 font-bold text-xs mt-3 uppercase tracking-widest">
              {step === 1 ? 'Шаг 1: Учетные данные' : 'Шаг 2: Данные компании'}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-mail адрес</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">mail</span>
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="example@mail.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Желаемый логин</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                  <input 
                    type="text"
                    required
                    value={login}
                    onChange={(e) => setLogin(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="Ваш логин"
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

              <div className="pt-4 flex flex-col gap-4">
                <button 
                  type="submit"
                  className="w-full bg-primary hover:bg-blue-700 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-3 text-lg"
                >
                  <span>Далее</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
                <button 
                  type="button"
                  onClick={onBackToLogin}
                  className="w-full text-slate-400 hover:text-slate-600 font-bold py-2 transition-colors text-sm"
                >
                  Уже есть аккаунт? Войти
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCompleteRegistration} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Тип организации</label>
                  <select 
                    value={companyType}
                    onChange={(e) => setCompanyType(e.target.value as CompanyInfo['type'])}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-bold transition-all appearance-none"
                  >
                    <option value="ИП">Индивидуальный предприниматель (ИП)</option>
                    <option value="ОсОО">Общество с огр. ответственностью (ОсОО)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ИНН</label>
                  <input 
                    type="text"
                    required
                    value={inn}
                    onChange={(e) => setInn(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="14 цифр"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Юридический адрес</label>
                <input 
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                  placeholder="Город, улица, дом, офис"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Расчетный счет (IBAN)</label>
                <input 
                  type="text"
                  required
                  value={settlementAccount}
                  onChange={(e) => setSettlementAccount(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                  placeholder="11800000..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Название банка</label>
                  <input 
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="Напр. Оптима Банк"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">БИК Банка</label>
                  <input 
                    type="text"
                    required
                    value={bik}
                    onChange={(e) => setBik(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="6 цифр"
                  />
                </div>
              </div>

              <div className="pt-6 flex flex-col sm:flex-row gap-4">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-black py-4 rounded-2xl transition-all active:scale-95"
                >
                  Назад
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <div className="size-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Завершить регистрацию</span>
                      <span className="material-symbols-outlined">verified</span>
                    </>
                  )}
                </button>
              </div>
              {error && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-bold animate-in fade-in slide-in-from-top-1">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}
            </form>
          )}

          <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
            <span className="material-symbols-outlined text-primary">security</span>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Нажимая «Завершить регистрацию», вы подтверждаете согласие с правилами сервиса и обработкой персональных данных. Ваши платежные реквизиты будут использоваться только для генерации счетов.
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

export default RegisterScreen;
