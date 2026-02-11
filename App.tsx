
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
import Sidebar from './components/Sidebar';
import { Toaster } from 'react-hot-toast';

const screenToPath: Record<Screen, string> = {
  [Screen.LOGIN]: '/login',
  [Screen.REGISTER]: '/register',
  [Screen.LANDING]: '/data-grid',
  [Screen.DATA_GRID]: '/data-grid',
  [Screen.NEW_INVOICE]: '/new-invoice',
  [Screen.CLIENTS]: '/clients',
  [Screen.REPORTS]: '/reports',
  [Screen.RETAIL]: '/retail',
  [Screen.ARCHIVE]: '/archive'
};

const pathToScreen = (pathname: string): Screen => {
  if (pathname.startsWith('/data-grid')) return Screen.DATA_GRID;
  if (pathname.startsWith('/new-invoice')) return Screen.NEW_INVOICE;
  if (pathname.startsWith('/clients')) return Screen.CLIENTS;
  if (pathname.startsWith('/reports')) return Screen.REPORTS;
  if (pathname.startsWith('/retail')) return Screen.RETAIL;
  if (pathname.startsWith('/archive')) return Screen.ARCHIVE;
  if (pathname.startsWith('/register')) return Screen.REGISTER;
  if (pathname.startsWith('/login')) return Screen.LOGIN;
  return Screen.DATA_GRID;
};

const storageKeys = {
  users: 'taxflow_users',
  session: 'taxflow_session',
  realizations: 'taxflow_realizations'
};

type SessionData = {
  login: string;
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
  
  const [clients, setClients] = useState<Client[]>([
    {
      id: '1',
      name: 'ОсОО "Технопром"',
      type: 'ОсОО',
      inn: '02506202110123',
      okpo: '12345678',
      bankName: 'Оптима Банк',
      bik: '109001',
      account: '1180000012345678'
    },
    {
      id: '2',
      name: 'ИП Иванов Иван Иванович',
      type: 'ИП',
      inn: '10101198510234',
      okpo: '87654321',
      bankName: 'Демир Банк',
      bik: '118001',
      account: '1240000087654321'
    }
  ]);

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

  useEffect(() => {
    try {
      const rawUsers = localStorage.getItem(storageKeys.users);
      const parsedUsers: AccountUser[] = rawUsers ? JSON.parse(rawUsers) : [];
      setUsers(parsedUsers);
      const rawSession = localStorage.getItem(storageKeys.session);
      const session: SessionData | null = rawSession ? JSON.parse(rawSession) : null;
      const rawRealizations = localStorage.getItem(storageKeys.realizations);
      const parsedRealizations: RealizationRecord[] = rawRealizations ? JSON.parse(rawRealizations) : [];
      const normalizedRealizations = parsedRealizations.map((r) => ({
        ...r,
        items: Array.isArray(r.items) ? r.items : []
      }));
      setRealizations(normalizedRealizations);
      if (session?.login) {
        if (session.login === 'admin') {
          setIsAuthenticated(true);
          setUserCompany({
            type: 'ОсОО',
            inn: '12345678901234',
            address: 'г. Бишкек, ул. Киевская 100',
            account: '1180000099887766',
            bankName: 'KICB',
            bik: '128001'
          });
        } else {
          const matched = parsedUsers.find((u) => u.login === session.login);
          if (matched) {
            setIsAuthenticated(true);
            setUserCompany(matched.company);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load local auth data:', error);
    } finally {
      setIsAuthInitialized(true);
    }
  }, []);

  const persistUsers = (nextUsers: AccountUser[]) => {
    setUsers(nextUsers);
    localStorage.setItem(storageKeys.users, JSON.stringify(nextUsers));
  };

  const persistSession = (login: string) => {
    localStorage.setItem(storageKeys.session, JSON.stringify({ login }));
  };

  const persistRealizations = (next: RealizationRecord[]) => {
    setRealizations(next);
    localStorage.setItem(storageKeys.realizations, JSON.stringify(next));
  };

  const handleLogin = (login: string, password: string): string | null => {
    if (login === 'admin' && password === 'admin') {
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
      navigate('/');
      return null;
    }

    const matched = users.find((u) => u.login === login && u.password === password);
    if (!matched) {
      return 'Неверный логин или пароль';
    }
    setIsAuthenticated(true);
    setUserCompany(matched.company);
    persistSession(matched.login);
    navigate('/data-grid');
    return null;
  };

  const handleRegisterSuccess = (user: AccountUser): string | null => {
    const loginExists = users.some((u) => u.login.toLowerCase() === user.login.toLowerCase());
    const emailExists = users.some((u) => u.email.toLowerCase() === user.email.toLowerCase());
    if (loginExists) {
      return 'Этот логин уже занят';
    }
    if (emailExists) {
      return 'Этот e-mail уже зарегистрирован';
    }

    const nextUsers = [...users, user];
    persistUsers(nextUsers);
    setUserCompany(user.company);
    setIsAuthenticated(true);
    persistSession(user.login);
    navigate('/data-grid');
    return null;
  };

  const handleSaveRealization = (realization: RealizationRecord) => {
    const next = [realization, ...realizations];
    persistRealizations(next);
  };

  const handleUpdateRealization = (realization: RealizationRecord) => {
    const next = realizations.map((row) => (row.id === realization.id ? realization : row));
    persistRealizations(next);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserCompany(null);
    localStorage.removeItem(storageKeys.session);
    navigate('/login');
  };

  const handleDataLoaded = (entries: TaxEntry[]) => {
    setTaxEntries((prev) => [...entries, ...prev]);
    navigate('/data-grid');
  };

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
                    onEntriesUpdated={setTaxEntries}
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
                  <ClientsScreen clients={clients} onUpdateClients={setClients} />
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
                  <RetailScreen entries={taxEntries} onEntriesUpdated={setTaxEntries} />
                </RequireAuth>
              }
            />
            <Route
              path="/archive"
              element={
                <RequireAuth>
                  <ArchiveScreen entries={taxEntries} onEntriesUpdated={setTaxEntries} />
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
            <Route path="*" element={<Navigate to={isAuthenticated ? '/' : '/login'} replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;
