import { useState, useEffect, useCallback } from 'react';
import {
  Calendar, X, AlertTriangle, Package, ShoppingCart, Users,
  Loader2, DollarSign
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Product, Sale } from '@/types';
import KPIMetrics from './KPIMetrics';
import SalesPurchaseChart from './SalesPurchaseChart';
import { OverallInfoCard, CustomerOverviewCard } from './InfoCards';

interface DashboardContentProps {
  onNavigate: (page: string) => void;
}

export default function DashboardContent({ onNavigate }: DashboardContentProps) {
  const [showAlert, setShowAlert] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState(0);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const now = new Date();
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

    try {
      const [sales, prods, custs] = await Promise.all([
        api.sales.getAll({ dateFrom: today }),
        api.products.getAll(),
        api.customers.getAll(),
      ]);

      if (sales) {
        setTodaySales(sales);
        setTodayRevenue(sales
          .filter((sale: Sale) => String(sale.payment_status).toLowerCase() === 'paid')
          .reduce((sum: number, sale: Sale) => sum + Number(sale.total), 0));
      }

      if (prods) {
        setProductCount(prods.length);
        const lowStocks = prods
          .filter((p: Product) => p.stock_quantity <= p.low_stock_threshold)
          .sort((a: Product, b: Product) => a.stock_quantity - b.stock_quantity)
          .slice(0, 5);
        setLowStockProducts(lowStocks);
      }

      if (custs) {
        setTotalCustomers(custs.length);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil data dashboard dari database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchDashboardData(); }, [fetchDashboardData]);

  const todayStats = [
    { icon: ShoppingCart, label: 'Transaksi Hari Ini', value: `${todaySales.length}`, color: 'text-orange-600', bg: 'bg-orange-50' },
    { icon: Package, label: 'Produk', value: productCount.toLocaleString('id-ID'), color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: Users, label: 'Pelanggan', value: totalCustomers.toLocaleString('id-ID'), color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: DollarSign, label: 'Penjualan Lunas Hari Ini', value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(todayRevenue), color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        <p>Data dashboard tidak dapat dimuat: {error}</p>
        <button onClick={() => void fetchDashboardData()} className="mt-2 font-semibold underline">
          Coba lagi
        </button>
      </div>
    );
  }

  const alertProduct = lowStockProducts[0];

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Ringkasan Database</h1>
            <p className="mt-1 text-sm text-gray-500">
              <span className="font-semibold text-orange-600">{todaySales.length} transaksi</span> tercatat hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            {new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(new Date())}
          </div>
        </div>

        {/* Today stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          {todayStats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-gray-800 leading-tight">{s.value}</div>
                <div className="text-xs text-gray-400">{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low stock alert banner */}
      {showAlert && alertProduct && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-400/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-700">
                Stok <span className="font-semibold">{alertProduct.name}</span> tinggal {alertProduct.stock_quantity} {alertProduct.unit}; batas minimum {alertProduct.low_stock_threshold} {alertProduct.unit}.
              </p>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline mt-0.5"
              >
                View Stock
              </button>
            </div>
          </div>
          <button onClick={() => setShowAlert(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-white/60 hover:text-gray-600 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Metrics */}
      <KPIMetrics />

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <SalesPurchaseChart />
        <div className="space-y-5">
          <OverallInfoCard />
          <CustomerOverviewCard />
        </div>
      </div>
    </div>
  );
}
