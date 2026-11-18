import { useCallback, useEffect, useState } from 'react';
import {
  BadgeDollarSign,
  Boxes,
  CalendarDays,
  Clock3,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { api, type CustomerRecord } from '@/lib/api';
import type { Product, Sale } from '@/types';

interface Metric {
  id: string;
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  color: string;
  background: string;
  border?: string;
}

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function isPaid(sale: Sale) {
  return String(sale.payment_status).toLowerCase() === 'paid';
}

export default function KPIMetrics() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sales, products, customers]: [Sale[], Product[], CustomerRecord[]] = await Promise.all([
        api.sales.getAll(),
        api.products.getAll(),
        api.customers.getAll(),
      ] as const);

      const paidSales = sales.filter(isPaid);
      const pendingSales = sales.filter(sale => String(sale.payment_status).toLowerCase() === 'pending');
      const totalPaid = paidSales.reduce((sum, sale) => sum + Number(sale.total), 0);
      const currentDate = new Date();
      const currentMonthSales = paidSales.filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate.getFullYear() === currentDate.getFullYear()
          && saleDate.getMonth() === currentDate.getMonth();
      });
      const currentMonthRevenue = currentMonthSales.reduce((sum, sale) => sum + Number(sale.total), 0);
      const inventoryValue = products.reduce(
        (sum, product) => sum + Number(product.cost) * Number(product.stock_quantity),
        0
      );
      const stockCount = products.reduce(
        (sum, product) => sum + Number(product.stock_quantity),
        0
      );

      setMetrics([
        {
          id: 'paid-sales',
          label: 'Total Penjualan Lunas',
          value: currency.format(totalPaid),
          description: `${paidSales.length} transaksi dari database`,
          icon: ShoppingCart,
          color: 'text-orange-600',
          background: 'bg-orange-100',
          border: 'border-l-orange-500',
        },
        {
          id: 'paid-transactions',
          label: 'Transaksi Lunas',
          value: paidSales.length.toLocaleString('id-ID'),
          description: 'Jumlah transaksi berstatus lunas',
          icon: Receipt,
          color: 'text-blue-600',
          background: 'bg-blue-100',
          border: 'border-l-blue-500',
        },
        {
          id: 'inventory-value',
          label: 'Nilai Modal Stok',
          value: currency.format(inventoryValue),
          description: 'Harga modal × jumlah stok saat ini',
          icon: Package,
          color: 'text-teal-600',
          background: 'bg-teal-100',
          border: 'border-l-teal-500',
        },
        {
          id: 'pending-sales',
          label: 'Pembayaran Tertunda',
          value: currency.format(pendingSales.reduce((sum, sale) => sum + Number(sale.total), 0)),
          description: `${pendingSales.length} transaksi berstatus pending`,
          icon: Clock3,
          color: 'text-amber-600',
          background: 'bg-amber-100',
          border: 'border-l-amber-500',
        },
        {
          id: 'month-sales',
          label: 'Penjualan Bulan Ini',
          value: currency.format(currentMonthRevenue),
          description: `${currentMonthSales.length} transaksi lunas bulan ini`,
          icon: CalendarDays,
          color: 'text-emerald-600',
          background: 'bg-emerald-100',
        },
        {
          id: 'average-sale',
          label: 'Rata-rata Transaksi',
          value: currency.format(paidSales.length ? totalPaid / paidSales.length : 0),
          description: 'Total penjualan lunas ÷ transaksi lunas',
          icon: BadgeDollarSign,
          color: 'text-violet-600',
          background: 'bg-violet-100',
        },
        {
          id: 'customers',
          label: 'Pelanggan',
          value: customers.length.toLocaleString('id-ID'),
          description: 'Jumlah data pelanggan di database',
          icon: Users,
          color: 'text-sky-600',
          background: 'bg-sky-100',
        },
        {
          id: 'stock',
          label: 'Jumlah Stok',
          value: stockCount.toLocaleString('id-ID'),
          description: `${products.length} produk terdaftar`,
          icon: Boxes,
          color: 'text-rose-600',
          background: 'bg-rose-100',
        },
      ]);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil ringkasan dari database.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-gray-500">Memuat ringkasan database...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p>Ringkasan tidak dapat dimuat: {error}</p>
        <button onClick={() => void fetchMetrics()} className="mt-2 font-semibold underline">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(0, 4).map(metric => (
          <div key={metric.id} className={`rounded-xl border border-gray-100 border-l-4 ${metric.border} bg-white p-5 shadow-sm`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-500">{metric.label}</div>
                <div className="mt-1 truncate text-xl font-bold text-gray-800">{metric.value}</div>
              </div>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${metric.background}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400">{metric.description}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.slice(4).map(metric => (
          <div key={metric.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${metric.background}`}>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
              <div className="text-sm font-medium text-gray-500">{metric.label}</div>
            </div>
            <div className="mb-1 text-xl font-bold text-gray-800">{metric.value}</div>
            <p className="text-xs text-gray-400">{metric.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
