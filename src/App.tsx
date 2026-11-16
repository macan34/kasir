import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DashboardContent from '@/components/DashboardContent';
import POSScreen from '@/components/POSScreen';
import ProductsPage from '@/components/ProductsPage';
import TransactionsPage from '@/components/TransactionsPage';
import CategoriesPage from '@/components/CategoriesPage';
import ManageStockPage from '@/components/ManageStockPage';
import CustomersPage from '@/components/CustomersPage';
import BarcodePrintPage from '@/components/BarcodePrintPage';
import ActivityLogsPage from '@/components/ActivityLogsPage';
import { api } from '@/lib/api';
import type { Store } from '@/types';

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeItem, setActiveItem] = useState('dashboard');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  useEffect(() => {
    api.stores.getAll().then((data: Store[]) => {
      if (data && data.length > 0) {
        setStores(data);
        setSelectedStore(data[0]);
      }
    }).catch(err => {
      console.error('Failed to load stores from local database:', err);
    });
  }, []);

  function handleNavigate(page: string) {
    setActiveItem(page);
    setMobileOpen(false);
    window.scrollTo(0, 0);
  }

  function renderContent() {
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
            <POSScreen store={selectedStore} />
          </div>
        );
      
      case 'transactions':
      case 'invoices':
        return <TransactionsPage store={selectedStore} />;

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
        return <ActivityLogsPage />;

      default:
        return <DashboardContent onNavigate={handleNavigate} />;
    }
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
        />
        <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
