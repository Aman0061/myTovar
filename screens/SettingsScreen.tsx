import React, { useState, useEffect } from 'react';
import { CompanyInfo } from '../types';

interface SettingsScreenProps {
  userCompany: CompanyInfo | null;
  onUpdateCompany: (company: CompanyInfo) => void;
  onBack: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  userCompany,
  onUpdateCompany,
  onBack
}) => {
  const [type, setType] = useState<CompanyInfo['type']>('ИП');
  const [name, setName] = useState('');
  const [inn, setInn] = useState('');
  const [address, setAddress] = useState('');
  const [account, setAccount] = useState('');
  const [bankName, setBankName] = useState('');
  const [bik, setBik] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (userCompany) {
      setType(userCompany.type);
      setName(userCompany.name || '');
      setInn(userCompany.inn || '');
      setAddress(userCompany.address || '');
      setAccount(userCompany.account || '');
      setBankName(userCompany.bankName || '');
      setBik(userCompany.bik || '');
    }
  }, [userCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const innDigits = inn.replace(/\D/g, '');
    const bikDigits = bik.replace(/\D/g, '');
    if (innDigits.length !== 14) {
      return;
    }
    if (bikDigits.length !== 6) {
      return;
    }
    setIsSaving(true);
    setSaved(false);
    onUpdateCompany({
      type,
      name: name.trim() || undefined,
      inn,
      address,
      account,
      bankName,
      bik
    });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Настройки
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Данные компании
          </p>
        </div>
        <button
          onClick={onBack}
          className="text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
        >
          Назад
        </button>
      </div>

      <div className="space-y-6">
        {/* Компания */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-6"
        >
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">business</span>
            Моя компания
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Тип
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CompanyInfo['type'])}
                  className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-bold transition-all text-sm"
                >
                  <option value="ИП">ИП</option>
                  <option value="ОсОО">ОсОО</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  ФИО / Название
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                  placeholder="Иванов Иван Иванович"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                ИНН
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={14}
                value={inn}
                onChange={(e) => setInn(e.target.value.replace(/\D/g, '').slice(0, 14))}
                className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                placeholder="14 цифр"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                Юридический адрес
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                placeholder="Город, улица, дом"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                Расчётный счёт
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                placeholder="11800000..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  Банк
                </label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                  placeholder="Оптима Банк"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">
                  БИК
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={bik}
                  onChange={(e) => setBik(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 rounded-xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all text-sm"
                  placeholder="6 цифр"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={isSaving || inn.replace(/\D/g, '').length !== 14 || bik.replace(/\D/g, '').length !== 6}
              className="px-6 py-3 bg-primary hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all shadow-lg shadow-primary/25 active:scale-95 flex items-center gap-2"
            >
              {saved ? (
                <>
                  <span className="material-symbols-outlined text-lg">check</span>
                  Сохранено
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Сохранить
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsScreen;
