import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardContent from '@/components/DashboardContent';
import POSScreen from '@/components/POSScreen';
import OrdersPage from '@/components/OrdersPage';
import CustomerOrdersPanel from '@/components/CustomerOrdersPanel';
import ProductsPage from '@/components/ProductsPage';
import TransactionsPage from '@/components/TransactionsPage';
import CategoriesPage from '@/components/CategoriesPage';
import ManageStockPage from '@/components/ManageStockPage';
import CustomersPage from '@/components/CustomersPage';
import BarcodePrintPage from '@/components/BarcodePrintPage';
import ActivityLogsPage from '@/components/ActivityLogsPage';
import WelcomePage from '@/components/WelcomePage';
import { ClipboardList, ShoppingCart } from 'lucide-react';
import { api, type AppUser } from '@/lib/api';
import type { Store } from '@/types';

function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [customerPage, setCustomerPage] = useState<'catalog' | 'orders'>(() => (
    new URLSearchParams(window.location.search).get('page') === 'orders' ? 'orders' : 'catalog'
  ));

  const fetchStores = useCallback(async () => {
    try {
      const data: Store[] = await api.stores.getAll();
      if (data && data.length > 0) {
        setStores(data);
        setSelectedStore(data[0]);
      }
    } catch (err) {
      console.error('Failed to load stores from local database:', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('retaillet-token');
    if (token) {
      api.auth.getCurrentUser()
        .then(currentUser => {
          setUser(currentUser);
          setActiveItem(currentUser.role === 'cashier' ? 'pos' : 'dashboard');
          void fetchStores();
        })
        .catch(err => {
          console.error('Stored login session is no longer valid:', err);
          localStorage.removeItem('retaillet-token');
        })
        .finally(() => setAuthLoading(false));
    } else {
      setAuthLoading(false);
    }
  }, [fetchStores]);

  useEffect(() => {
    const handleExpiredSession = () => {
      setUser(null);
      setActiveItem('dashboard');
    };
    window.addEventListener('retaillet:session-expired', handleExpiredSession);
    return () => window.removeEventListener('retaillet:session-expired', handleExpiredSession);
  }, []);

  function handleNavigate(page: string) {
    if (user?.role === 'customer') return;
    if (user?.role === 'cashier' && page !== 'pos' && page !== 'orders' && page !== 'transactions') return;
    if (page === 'super-admin' && user?.role !== 'superadmin') return;
    setActiveItem(page);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }

  async function handleLogin(expectedRole: AppUser['role'], username: string, password: string) {
    const result = await api.auth.login(username, password);
    if (result.user.role !== expectedRole) {
      localStorage.setItem('retaillet-token', result.token);
      try {
        await api.auth.logout();
      } finally {
        localStorage.removeItem('retaillet-token');
      }
      throw new Error(`Akun ini terdaftar sebagai ${result.user.role}, bukan peran yang dipilih.`);
    }
    localStorage.setItem('retaillet-token', result.token);
    setUser(result.user);
    setActiveItem(result.user.role === 'cashier' ? 'pos' : 'dashboard');
    void fetchStores();
    return result.user;
  }

  async function handleLogout() {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Failed to revoke server login session:', err);
    } finally {
      localStorage.removeItem('retaillet-token');
      setUser(null);
      setActiveItem('dashboard');
    }
  }

  function renderContent(cashierName: string, role: AppUser['role']) {
    switch (activeItem) {
      case 'dashboard':
        return <DashboardContent onNavigate={handleNavigate} />;
      
      case 'pos':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-800">Kasir Point of Sale (POS)</h1>
              <span className="text-xs bg-orange-100 text-orange-700 px-2.5 py-1 rounded-full font-semibold">
                Printer: Epson TM-T82X Ready
              </span>
            </div>
            <POSScreen store={selectedStore} cashierName={cashierName} />
          </div>
        );
      
      case 'transactions':
      case 'invoices':
        return <TransactionsPage store={selectedStore} />;

      case 'orders':
        return role === 'superadmin' || role === 'cashier'
          ? <OrdersPage />
          : <DashboardContent onNavigate={handleNavigate} />;

      case 'products':
      case 'create-product':
      case 'low-stocks':
      case 'expired-products':
        return <ProductsPage store={selectedStore} onNavigate={handleNavigate} />;

      case 'category':
      case 'sub-category':
      case 'brands':
      case 'units':
      case 'variant-attributes':
      case 'warranties':
        return <CategoriesPage />;

      case 'manage-stock':
      case 'stock-adjustment':
      case 'stock-transfer':
        return <ManageStockPage />;

      case 'customers':
        return <CustomersPage />;

      case 'print-barcode':
      case 'print-qr':
        return <BarcodePrintPage />;

      case 'super-admin':
        return role === 'superadmin' ? <ActivityLogsPage /> : <DashboardContent onNavigate={handleNavigate} />;

      default:
        return <DashboardContent onNavigate={handleNavigate} />;
    }
  }

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-orange-400">Memeriksa sesi...</div>;
  }
  if (!user) return <WelcomePage onLogin={handleLogin} />;

  if (user.role === 'customer') {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800">Retaillet</p>
              <p className="text-xs text-gray-500">{customerPage === 'orders' ? 'Pesanan Saya' : 'Belanja Produk'}</p>
            </div>
          </div>
          <nav className="flex items-center gap-1" aria-label="Navigasi pelanggan">
            <button
              onClick={() => setCustomerPage('catalog')}
              aria-current={customerPage === 'catalog' ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                customerPage === 'catalog'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Belanja</span>
            </button>
            <button
              onClick={() => setCustomerPage('orders')}
              aria-current={customerPage === 'orders' ? 'page' : undefined}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                customerPage === 'orders'
                  ? 'bg-orange-50 text-orange-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Pesanan Saya</span>
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-600 sm:inline">Hai, {user.name}</span>
            <button onClick={handleLogout} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Keluar
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 sm:p-6">
          {customerPage === 'orders' ? (
            <CustomerOrdersPanel />
          ) : (
            <>
              <div className="mb-4">
                <h1 className="text-xl font-bold text-gray-800">Belanja Produk</h1>
                <p className="text-sm text-gray-500">Pilih produk untuk dimasukkan ke keranjang dan buat pesanan.</p>
              </div>
              <POSScreen store={selectedStore} mode="customer" customerName={user.name} />
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - desktop */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
          activeItem={activeItem}
          onSelect={handleNavigate}
          role={user.role}
        />
      </div>

      {/* Sidebar - mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              activeItem={activeItem}
              onSelect={handleNavigate}
              role={user.role}
            />
          </div>
        </>
      )}

      {/* Main content */}
      <div className={`transition-all duration-300 ${collapsed ? 'lg:ml-[68px]' : 'lg:ml-64'}`}>
        <Header
          onMenuToggle={() => setMobileOpen(true)}
          stores={stores}
          selectedStore={selectedStore}
          onStoreChange={setSelectedStore}
          onNavigate={handleNavigate}
          userName={user.name}
          userRole={user.role}
          onLogout={handleLogout}
        />
        <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
          {renderContent(user.name, user.role)}
        </main>
      </div>
    </div>
  );
}

export default App;
