
import React, { useState, useMemo, useEffect } from 'react';
import { Client } from '../types';
import { toast } from 'react-hot-toast';

interface ClientsScreenProps {
  clients: Client[];
  onUpdateClients: (clients: Client[]) => void;
}

const ClientsScreen: React.FC<ClientsScreenProps> = ({ clients, onUpdateClients }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  const [newClient, setNewClient] = useState<Omit<Client, 'id'>>({
    name: '',
    type: 'ОсОО',
    inn: '',
    okpo: '',
    bankName: '',
    bik: '',
    account: ''
  });

  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.inn.includes(search)
    );
  }, [clients, search]);

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClientId) {
      onUpdateClients(
        clients.map((client) =>
          client.id === editingClientId ? { ...client, ...newClient } : client
        )
      );
      toast.success('Клиент обновлен');
    } else {
      const client: Client = {
        ...newClient,
        id: generateId()
      };
      onUpdateClients([...clients, client]);
      toast.success('Клиент добавлен');
    }
    setIsModalOpen(false);
    setEditingClientId(null);
    setNewClient({
      name: '',
      type: 'ОсОО',
      inn: '',
      okpo: '',
      bankName: '',
      bik: '',
      account: ''
    });
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Вы уверены, что хотите удалить этого клиента?')) {
      onUpdateClients(clients.filter(c => c.id !== id));
      toast.success('Клиент удален');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClientId(client.id);
    setNewClient({
      name: client.name,
      type: client.type,
      inn: client.inn,
      okpo: client.okpo,
      bankName: client.bankName,
      bik: client.bik,
      account: client.account
    });
    setIsModalOpen(true);
    setOpenMenuId(null);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        openMenuId &&
        !(event.target as HTMLElement).closest('[data-client-menu]')
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
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Клиенты</h2>
          <nav className="flex items-center text-xs text-slate-500 gap-2 font-bold">
            <span className="hover:text-primary cursor-pointer transition-colors">Главная</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">База клиентов</span>
          </nav>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative group flex-1 md:flex-none">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary">
              <span className="material-symbols-outlined text-xl">search</span>
            </div>
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full md:w-72 pl-10 pr-4 py-2.5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl text-sm focus:ring-primary focus:border-primary transition-all shadow-sm"
              placeholder="Поиск по названию или ИНН..."
            />
          </div>
          <button 
            onClick={() => {
              setEditingClientId(null);
              setIsModalOpen(true);
            }}
            className="bg-primary hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xl shadow-primary/20 transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-xl">person_add</span>
            Добавить клиента
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto min-h-[320px]">
          {filteredClients.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Тип</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Наименование</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">ИНН / ОКПО</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">Банковские данные</th>
                  <th className="px-5 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${client.type === 'ОсОО' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {client.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-sm font-black text-slate-900 dark:text-white">{client.name}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500 font-bold">
                      <div>ИНН: {client.inn}</div>
                      <div>ОКПО: {client.okpo}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-500">
                      <div className="font-bold text-slate-700 dark:text-slate-300">{client.bankName} (БИК: {client.bik})</div>
                      <div className="font-medium">Р/С: {client.account}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <div className="relative inline-flex" data-client-menu>
                        <button
                          onClick={() => setOpenMenuId((prev) => (prev === client.id ? null : client.id))}
                          className="size-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Действия"
                        >
                          <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                        {openMenuId === client.id && (
                          <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 overflow-hidden">
                            <button
                              onClick={() => handleEditClient(client)}
                              className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                              Редактировать
                            </button>
                            <button
                              onClick={() => handleDeleteClient(client.id)}
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl text-slate-300">person_search</span>
              </div>
              <p className="text-slate-500 font-bold">Клиенты не найдены</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-3 text-primary font-black text-xs hover:underline">Добавить первого клиента</button>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {editingClientId ? 'Редактирование клиента' : 'Новый клиент'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingClientId(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-3xl">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddClient} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Тип организации</label>
                  <select 
                    value={newClient.type}
                    onChange={(e) => setNewClient({ ...newClient, type: e.target.value as Client['type'] })}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-bold transition-all appearance-none"
                  >
                    <option value="ОсОО">ОсОО</option>
                    <option value="ИП">ИП</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Наименование</label>
                  <input 
                    type="text"
                    required
                    value={newClient.name}
                    onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="Напр. ОсОО Ромашка"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ИНН</label>
                  <input 
                    type="text"
                    required
                    maxLength={14}
                    value={newClient.inn}
                    onChange={(e) => setNewClient({...newClient, inn: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="14 цифр"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">ОКПО</label>
                  <input 
                    type="text"
                    required
                    maxLength={8}
                    value={newClient.okpo}
                    onChange={(e) => setNewClient({...newClient, okpo: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="8 цифр"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Название банка</label>
                <input 
                  type="text"
                  required
                  value={newClient.bankName}
                  onChange={(e) => setNewClient({...newClient, bankName: e.target.value})}
                  className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                  placeholder="Напр. Оптима Банк"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">БИК Банка</label>
                  <input 
                    type="text"
                    required
                    maxLength={6}
                    value={newClient.bik}
                    onChange={(e) => setNewClient({...newClient, bik: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="6 цифр"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Расчетный счет</label>
                  <input 
                    type="text"
                    required
                    value={newClient.account}
                    onChange={(e) => setNewClient({...newClient, account: e.target.value})}
                    className="w-full px-5 py-4 rounded-2xl border-slate-200 dark:border-slate-800 dark:bg-slate-950 focus:ring-primary focus:border-primary font-medium transition-all"
                    placeholder="16-20 цифр"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 border-2 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-black py-4 rounded-2xl transition-all active:scale-95"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="flex-[2] bg-primary hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95"
                >
                  {editingClientId ? 'Сохранить' : 'Добавить клиента'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsScreen;
