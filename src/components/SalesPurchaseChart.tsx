import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

const timeFilters = ['3M', '6M', '1Y'] as const;
type TimeFilter = (typeof timeFilters)[number];

interface MonthlyData {
  key: string;
  month: string;
  sales: number;
  transactions: number;
}

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function SalesPurchaseChart() {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('1Y');
  const [hovered, setHovered] = useState<number | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSales(await api.sales.getAll());
    } catch (err) {
      console.error('Error fetching sales chart data:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil data penjualan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSales();
  }, [fetchSales]);

  const data = useMemo(() => {
    const monthCount = activeFilter === '3M' ? 3 : activeFilter === '6M' ? 6 : 12;
    const now = new Date();
    const periods: MonthlyData[] = [];
    const periodByKey = new Map<string, MonthlyData>();

    for (let offset = monthCount - 1; offset >= 0; offset--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const key = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const period: MonthlyData = {
        key,
        month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(monthDate),
        sales: 0,
        transactions: 0,
      };
      periods.push(period);
      periodByKey.set(key, period);
    }

    for (const sale of sales) {
      if (String(sale.payment_status).toLowerCase() !== 'paid') continue;
      const date = new Date(sale.created_at);
      if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const period = periodByKey.get(key);
      if (!period) continue;
      period.sales += Number(sale.total) || 0;
      period.transactions += 1;
    }

    return periods;
  }, [activeFilter, sales]);

  const totalSales = data.reduce((sum, period) => sum + period.sales, 0);
  const totalTransactions = data.reduce((sum, period) => sum + period.transactions, 0);
  const maxSales = Math.max(...data.map(period => period.sales), 1);
  const chartHeight = 240;

  if (loading) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 xl:col-span-2">
        <p>Grafik penjualan tidak dapat dimuat: {error}</p>
        <button onClick={() => void fetchSales()} className="mt-2 font-semibold underline">
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-base font-bold text-gray-800">Penjualan dari Database</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-orange-500" />
              <span className="text-gray-500">Penjualan lunas</span>
              <span className="font-semibold text-gray-700">{currency.format(totalSales)}</span>
            </span>
            <span className="text-gray-500">{totalTransactions.toLocaleString('id-ID')} transaksi</span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1">
          {timeFilters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${activeFilter === filter ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <div className="absolute bottom-6 left-0 top-0 flex flex-col justify-between text-[10px] font-medium text-gray-400">
          <span>{currency.format(maxSales)}</span>
          <span>{currency.format(maxSales / 2)}</span>
          <span>{currency.format(0)}</span>
        </div>
        <div className="pointer-events-none absolute bottom-6 left-32 right-0 top-0 flex flex-col justify-between">
          <div className="border-t border-gray-100" />
          <div className="border-t border-dashed border-gray-100" />
          <div className="border-t border-gray-100" />
        </div>
        <div className="relative ml-32 flex items-end justify-between gap-1" style={{ height: chartHeight }}>
          {data.map((period, index) => {
            const barHeight = (period.sales / maxSales) * (chartHeight - 24);
            return (
              <div
                key={period.key}
                className="group relative flex h-full flex-1 cursor-pointer flex-col items-center"
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
              >
                {hovered === index && (
                  <div className="absolute -top-2 z-10 whitespace-nowrap rounded-lg bg-gray-800 px-3 py-2 text-xs text-white shadow-xl">
                    <div className="mb-1 font-semibold">{period.month} {period.key.slice(0, 4)}</div>
                    <div>{currency.format(period.sales)}</div>
                    <div>{period.transactions} transaksi</div>
                  </div>
                )}
                <div className="flex flex-1 items-end">
                  <div
                    className="w-5 rounded-t bg-orange-500 transition-colors group-hover:bg-orange-400"
                    style={{ height: `${barHeight}px` }}
                  />
                </div>
                <span className={`mb-1 text-[10px] font-medium ${hovered === index ? 'text-orange-600' : 'text-gray-400'}`}>
                  {period.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {totalTransactions === 0 && (
        <p className="mt-4 text-center text-sm text-gray-500">Belum ada transaksi lunas pada periode ini.</p>
      )}
      <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
        Sumber data: transaksi berstatus lunas di database.
      </p>
    </div>
  );
}
