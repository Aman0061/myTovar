import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Screen, TaxEntry, Client, CompanyInfo, AccountUser, RealizationRecord } from './types';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DataGridScreen from './screens/DataGridScreen';
import AddProductsScreen from './screens/AddProductsScreen';
import NewInvoiceScreen from './screens/NewInvoiceScreen';
import ClientsScreen from './screens/ClientsScreen';
import ReportsScreen from './screens/ReportsScreen';
import RetailScreen from './screens/RetailScreen';
import ArchiveScreen from './screens/ArchiveScreen';
import TnvedAssignScreen from './screens/TnvedAssignScreen';
import SettingsScreen from './screens/SettingsScreen';
import Sidebar from './components/Sidebar';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './lib/supabaseClient';
import * as clientsApi from './lib/clients';
import * as productsApi from './lib/products';
import * as realizationsApi from './lib/realizations';
import * as authApi from './lib/auth';

const screenToPath: Record<Screen, string> = {
  [Screen.LOGIN]: '/login',
  [Screen.REGISTER]: '/register',
  [Screen.LANDING]: '/data-grid',
  [Screen.DATA_GRID]: '/data-grid',
  [Screen.NEW_INVOICE]: '/new-invoice',
  [Screen.CLIENTS]: '/clients',
  [Screen.REPORTS]: '/reports',
  [Screen.RETAIL]: '/retail',
  [Screen.ARCHIVE]: '/archive',
  [Screen.SETTINGS]: '/settings'
};

const pathToScreen = (pathname: string): Screen => {
  if (pathname.startsWith('/data-grid')) return Screen.DATA_GRID;
  if (pathname.startsWith('/new-invoice')) return Screen.NEW_INVOICE;
  if (pathname.startsWith('/clients')) return Screen.CLIENTS;
  if (pathname.startsWith('/reports')) return Screen.REPORTS;
  if (pathname.startsWith('/retail')) return Screen.RETAIL;
  if (pathname.startsWith('/archive')) return Screen.ARCHIVE;
  if (pathname.startsWith('/settings')) return Screen.SETTINGS;
  if (pathname.startsWith('/register')) return Screen.REGISTER;
  if (pathname.startsWith('/login')) return Screen.LOGIN;
  return Screen.DATA_GRID;
};

const THEME_KEY = 'taxflow_theme';

const storageKeys = {
  users: 'taxflow_users',
  session: 'taxflow_session',
  realizations: 'taxflow_realizations'
};

const ADMIN_USER_ID = '00000000-0000-0000-0000-000000000001';

type SessionData = {
  login: string;
  userId?: string;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthInitialized, setIsAuthInitialized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [taxEntries, setTaxEntries] = useState<TaxEntry[]>([]);
  const [userCompany, setUserCompany] = useState<CompanyInfo | null>(null);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [realizations, setRealizations] = useState<RealizationRecord[]>([]);
  
  const [clients, setClients] = useState<Client[]>([]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(THEME_KEY, isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const handleThemeChange = useCallback((dark: boolean) => {
    setIsDarkMode(dark);
  }, []);

  const navigateTo = useCallback((screen: Screen) => {
    const path = screenToPath[screen] || '/';
    navigate(path);
  }, [navigate]);

  const currentScreen = useMemo(() => pathToScreen(location.pathname), [location.pathname]);
  const NewInvoiceScreenWithProps = NewInvoiceScreen as React.ComponentType<{
    availableProducts: TaxEntry[];
    clients: Client[];
    userCompany: CompanyInfo | null;
    onBack: () => void;
    realizations: RealizationRecord[];
    onSaveRealization: (realization: RealizationRecord) => void;
    onUpdateRealization: (realization: RealizationRecord) => void;
  }>;

  const getUserId = useCallback(async (): Promise<string | null> => {
    const supabaseSession = await authApi.getSession();
    if (supabaseSession?.user?.id) return supabaseSession.user.id;
    try {
      const raw = localStorage.getItem(storageKeys.session);
      const session: SessionData | null = raw ? JSON.parse(raw) : null;
      if (session?.login === 'admin') return ADMIN_USER_ID;
      if (session?.userId) return session.userId;
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1) Проверяем Supabase сессию
        const supabaseSession = await authApi.getSession();
        if (supabaseSession?.user?.id) {
          const profile = await authApi.getProfile(supabaseSession.user.id);
          if (profile) {
            setIsAuthenticated(true);
            setUserCompany(authApi.profileToCompanyInfo(profile));
            const [loadedClients, loadedProducts, loadedRealizations] = await Promise.all([
              clientsApi.getClients(supabaseSession.user.id),
              productsApi.getProducts(supabaseSession.user.id),
              realizationsApi.getRealizations(supabaseSession.user.id)
            ]);
            setClients(loadedClients);
            setTaxEntries(loadedProducts);
            setRealizations(loadedRealizations);
          }
          setIsAuthInitialized(true);
          return;
        }

        // 2) Иначе проверяем admin в localStorage
        const rawSession = localStorage.getItem(storageKeys.session);
        const session: SessionData | null = rawSession ? JSON.parse(rawSession) : null;
        if (session?.login === 'admin') {
          setIsAuthenticated(true);
          persistSession('admin');
          setUserCompany({
            type: 'ОсОО',
            inn: '12345678901234',
            address: 'г. Бишкек, ул. Киевская 100',
            account: '1180000099887766',
            bankName: 'KICB',
            bik: '128001'
          });
          if (supabase) {
            const [loadedClients, loadedProducts, loadedRealizations] = await Promise.all([
              clientsApi.getClients(ADMIN_USER_ID),
              productsApi.getProducts(ADMIN_USER_ID),
              realizationsApi.getRealizations(ADMIN_USER_ID)
            ]);
            setClients(loadedClients);
            setTaxEntries(loadedProducts);
            setRealizations(loadedRealizations);
          } else {
            const rawRealizations = localStorage.getItem(storageKeys.realizations);
            const parsed = rawRealizations ? JSON.parse(rawRealizations) : [];
            setRealizations(parsed.map((r: RealizationRecord) => ({
              ...r,
              items: Array.isArray(r.items) ? r.items : []
            })));
          }
        }

        // Для обратной совместимости: пользователи из localStorage (если есть)
        const rawUsers = localStorage.getItem(storageKeys.users);
        const parsedUsers: AccountUser[] = rawUsers ? JSON.parse(rawUsers) : [];
        setUsers(parsedUsers);
        if (session?.login && session.login !== 'admin') {
          const matched = parsedUsers.find((u) => u.login === session.login);
          if (matched) {
            setIsAuthenticated(true);
            setUserCompany(matched.company);
            if (supabase && matched.id) {
              const [loadedClients, loadedProducts, loadedRealizations] = await Promise.all([
                clientsApi.getClients(matched.id),
                productsApi.getProducts(matched.id),
                realizationsApi.getRealizations(matched.id)
              ]);
              setClients(loadedClients);
              setTaxEntries(loadedProducts);
              setRealizations(loadedRealizations);
            } else {
              const rawRealizations = localStorage.getItem(storageKeys.realizations);
              const parsed: RealizationRecord[] = rawRealizations ? JSON.parse(rawRealizations) : [];
              setRealizations(parsed.map((r) => ({
                ...r,
                items: Array.isArray(r.items) ? r.items : []
              })));
            }
          }
        }
      } catch (error) {
        console.error('Failed to load auth data:', error);
      } finally {
        setIsAuthInitialized(true);
      }
    };
    loadData();
  }, []);

  const persistUsers = (nextUsers: AccountUser[]) => {
    setUsers(nextUsers);
    localStorage.setItem(storageKeys.users, JSON.stringify(nextUsers));
  };

  const persistSession = (login: string, userId?: string) => {
    localStorage.setItem(storageKeys.session, JSON.stringify({ login, userId: userId ?? (login === 'admin' ? ADMIN_USER_ID : undefined) }));
  };

  const persistRealizations = (next: RealizationRecord[]) => {
    setRealizations(next);
    localStorage.setItem(storageKeys.realizations, JSON.stringify(next));
  };

  const handleLogin = async (loginOrEmail: string, password: string): Promise<string | null> => {
    // Admin (локальный вход)
    if (loginOrEmail === 'admin' && password === 'admin') {
      setIsAuthenticated(true);
      setUserCompany({
        type: 'ОсОО',
        inn: '12345678901234',
        address: 'г. Бишкек, ул. Киевская 100',
        account: '1180000099887766',
        bankName: 'KICB',
        bik: '128001'
      });
      persistSession('admin');
      if (supabase) {
        const [loadedClients, loadedProducts, loadedRealizations] = await Promise.all([
          clientsApi.getClients(ADMIN_USER_ID),
          productsApi.getProducts(ADMIN_USER_ID),
          realizationsApi.getRealizations(ADMIN_USER_ID)
        ]);
        setClients(loadedClients);
        setTaxEntries(loadedProducts);
        setRealizations(loadedRealizations);
      }
      navigate('/');
      return null;
    }

    // Пользователи из localStorage (обратная совместимость)
    const matched = users.find((u) => (u.login === loginOrEmail || u.email === loginOrEmail) && u.password === password);
    if (matched) {
      setIsAuthenticated(true);
      setUserCompany(matched.company);
      persistSession(matched.login, matched.id);
      if (supabase && matched.id) {
        const [loadedClients, loadedProducts, loadedRealizations] = await Promise.all([
          clientsApi.getClients(matched.id),
          productsApi.getProducts(matched.id),
          realizationsApi.getRealizations(matched.id)
        ]);
        setClients(loadedClients);
        setTaxEntries(loadedProducts);
        setRealizations(loadedRealizations);
      }
      navigate('/data-grid');
      return null;
    }

    // Supabase Auth (вход по email)
    if (supabase) {
      try {
        const data = await authApi.signIn(loginOrEmail, password);
        const userId = data?.user?.id;
        const profile = userId ? await authApi.getProfile(userId) : null;
        setIsAuthenticated(true);
        setUserCompany(profile ? authApi.profileToCompanyInfo(profile) : null);
        const [loadedClients, loadedProducts, loadedRealizations] = userId
          ? await Promise.all([
              clientsApi.getClients(userId),
              productsApi.getProducts(userId),
              realizationsApi.getRealizations(userId)
            ])
          : [[], [], []];
        setClients(loadedClients);
        setTaxEntries(loadedProducts);
        setRealizations(loadedRealizations);
        navigate('/data-grid');
        return null;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return msg || 'Неверный e-mail или пароль';
      }
    }

    return 'Неверный логин или пароль';
  };

  const handleRegisterSuccess = async (
    email: string,
    password: string,
    company: CompanyInfo
  ): Promise<string | null> => {
    if (!supabase) {
      return 'Supabase не настроен';
    }
    try {
      const data = await authApi.signUp(email, password);
      const userId = data?.user?.id;
      if (!userId) return 'Регистрация не удалась';

      const fullName = company.name || email.split('@')[0] || '';
      await authApi.upsertProfile(userId, { ...company, full_name: fullName });

      setUserCompany(company);
      setIsAuthenticated(true);
      const loaded = await clientsApi.getClients(userId);
      setClients(loaded);
      navigate('/data-grid');
      return null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return msg || 'Ошибка регистрации';
    }
  };

  const handleSaveRealization = useCallback(
    async (realization: RealizationRecord) => {
      const userId = await getUserId();
      const next = [realization, ...realizations];
      setRealizations(next);
      if (userId && supabase) {
        try {
          await realizationsApi.insertRealization(userId, realization);
        } catch (e: unknown) {
          setRealizations(realizations);
          toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
        }
      } else {
        persistRealizations(next);
      }
    },
    [getUserId, realizations]
  );

  const handleUpdateRealization = useCallback(
    async (realization: RealizationRecord) => {
      const userId = await getUserId();
      const next = realizations.map((row) => (row.id === realization.id ? realization : row));
      setRealizations(next);
      if (userId && supabase) {
        try {
          await realizationsApi.updateRealization(userId, realization);
        } catch (e: unknown) {
          setRealizations(realizations);
          toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
        }
      } else {
        persistRealizations(next);
      }
    },
    [getUserId, realizations]
  );

  const handleLogout = async () => {
    await authApi.signOut();
    setIsAuthenticated(false);
    setUserCompany(null);
    setClients([]);
    setTaxEntries([]);
    setRealizations([]);
    localStorage.removeItem(storageKeys.session);
    navigate('/login');
  };

  const handleAddClient = useCallback(
    async (client: Omit<Client, 'id'>) => {
      const userId = await getUserId();
      if (!userId) {
        toast.error('Нет сессии');
        return;
      }
      if (supabase) {
        try {
          const saved = await clientsApi.insertClient(userId, client);
          setClients((prev) => [saved, ...prev]);
          toast.success('Клиент добавлен');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(`Ошибка: ${msg}`);
        }
      } else {
        const newClient: Client = {
          ...client,
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        };
        setClients((prev) => [newClient, ...prev]);
        toast.success('Клиент добавлен');
      }
    },
    [getUserId]
  );

  const handleEditClient = useCallback(
    async (client: Client) => {
      const userId = await getUserId();
      if (!userId) return;
      if (supabase) {
        try {
          await clientsApi.updateClient(userId, client);
          setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
          toast.success('Клиент обновлен');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(`Ошибка: ${msg}`);
        }
      } else {
        setClients((prev) => prev.map((c) => (c.id === client.id ? client : c)));
        toast.success('Клиент обновлен');
      }
    },
    [getUserId]
  );

  const handleDeleteClient = useCallback(
    async (id: string) => {
      const userId = await getUserId();
      if (!userId) return;
      if (supabase) {
        try {
          await clientsApi.deleteClient(userId, id);
          setClients((prev) => prev.filter((c) => c.id !== id));
          toast.success('Клиент удален');
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          toast.error(`Ошибка: ${msg}`);
        }
      } else {
        setClients((prev) => prev.filter((c) => c.id !== id));
        toast.success('Клиент удален');
      }
    },
    [getUserId]
  );

  const handleDataLoaded = useCallback(
    async (entries: TaxEntry[]) => {
      const userId = await getUserId();
      setTaxEntries((prev) => [...entries, ...prev]);
      if (userId && supabase) {
        try {
          await productsApi.addProducts(userId, entries);
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
        }
      }
      navigate('/data-grid');
    },
    [getUserId, navigate]
  );

  const handleUpdateCompany = useCallback(
    async (company: CompanyInfo) => {
      const userId = await getUserId();
      setUserCompany(company);
      if (userId && supabase && userId !== ADMIN_USER_ID) {
        try {
          await authApi.upsertProfile(userId, {
            ...company,
            full_name: company.name || ''
          });
          toast.success('Данные компании сохранены');
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
        }
      }
    },
    [getUserId]
  );

  const handleEntriesUpdated = useCallback(
    async (next: TaxEntry[]) => {
      const userId = await getUserId();
      setTaxEntries(next);
      if (userId && supabase) {
        try {
          await productsApi.saveProducts(userId, next);
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : 'Ошибка сохранения');
        }
      }
    },
    [getUserId]
  );

  const showNavigation = isAuthenticated;

  const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    if (!isAuthInitialized) {
      return null;
    }
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
      <Toaster position="top-right" />
      {showNavigation && (
        <Sidebar 
          isOpen={isSidebarOpen} 
          currentScreen={currentScreen} 
          onNavigate={navigateTo} 
          onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={handleLogout}
        />
      )}

      <div className={`flex-1 flex flex-col transition-all duration-300 ${showNavigation && isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <LoginScreen
                    onLogin={handleLogin}
                    onNavigateToRegister={() => navigate('/register')}
                  />
                )
              }
            />
            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/" replace />
                ) : (
                  <RegisterScreen
                    onBackToLogin={() => navigate('/login')}
                    onRegisterSuccess={handleRegisterSuccess}
                  />
                )
              }
            />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <Navigate to="/data-grid" replace />
                </RequireAuth>
              }
            />
            <Route
              path="/data-grid"
              element={
                <RequireAuth>
                  <DataGridScreen
                    entries={taxEntries}
                    onDataLoaded={handleDataLoaded}
                    onEntriesUpdated={handleEntriesUpdated}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/add-products"
              element={
                <RequireAuth>
                  <AddProductsScreen onDataLoaded={handleDataLoaded} />
                </RequireAuth>
              }
            />
            <Route
              path="/new-invoice"
              element={
                <RequireAuth>
                  <NewInvoiceScreenWithProps
                    availableProducts={taxEntries}
                    clients={clients}
                    userCompany={userCompany}
                    onBack={() => navigate('/data-grid')}
                    realizations={realizations}
                    onSaveRealization={handleSaveRealization}
                    onUpdateRealization={handleUpdateRealization}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/clients"
              element={
                <RequireAuth>
                  <ClientsScreen
                    clients={clients}
                    onAddClient={handleAddClient}
                    onEditClient={handleEditClient}
                    onDeleteClient={handleDeleteClient}
                  />
                </RequireAuth>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireAuth>
                  <ReportsScreen />
                </RequireAuth>
              }
            />
            <Route
              path="/retail"
              element={
                <RequireAuth>
                  <RetailScreen entries={taxEntries} onEntriesUpdated={handleEntriesUpdated} />
                </RequireAuth>
              }
            />
            <Route
              path="/archive"
              element={
                <RequireAuth>
                  <ArchiveScreen entries={taxEntries} onEntriesUpdated={handleEntriesUpdated} />
                </RequireAuth>
              }
            />
            <Route
              path="/tnved-assign"
              element={
                <RequireAuth>
                  <TnvedAssignScreen entries={taxEntries} />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsScreen
                    userCompany={userCompany}
                    onUpdateCompany={handleUpdateCompany}
                    onBack={() => navigate('/data-grid')}
                    isDarkMode={isDarkMode}
                    onThemeChange={handleThemeChange}
                  />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
