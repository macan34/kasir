import { useCallback, useEffect, useState } from 'react';
import { Boxes, ShoppingBag, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

interface OverallCounts {
  stores: number;
  customers: number;
  transactions: number;
}

export function OverallInfoCard() {
  const [counts, setCounts] = useState<OverallCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    setError(null);
    try {
      const [stores, customers, sales] = await Promise.all([
        api.stores.getAll(),
        api.customers.getAll(),
        api.sales.getAll(),
      ]);
      setCounts({
        stores: stores.length,
        customers: customers.length,
        transactions: sales.length,
      });
    } catch (err) {
      console.error('Error fetching overall database information:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil ringkasan database.');
    }
  }, []);

  useEffect(() => {
    void fetchCounts();
  }, [fetchCounts]);

  const counters = [
    { icon: Boxes, label: 'Cabang Toko', value: counts?.stores, color: 'text-teal-600', bg: 'bg-teal-100' },
    { icon: Users, label: 'Pelanggan', value: counts?.customers, color: 'text-blue-600', bg: 'bg-blue-100' },
    { icon: ShoppingBag, label: 'Transaksi', value: counts?.transactions, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-bold text-gray-800">Informasi Database</h3>
      {error ? (
        <div className="text-sm text-red-700">
          <p>Data tidak dapat dimuat: {error}</p>
          <button onClick={() => void fetchCounts()} className="mt-2 font-semibold underline">Coba lagi</button>
        </div>
      ) : (
        <div className="space-y-3">
          {counters.map(counter => (
            <div key={counter.label} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${counter.bg}`}>
                  <counter.icon className={`h-5 w-5 ${counter.color}`} />
                </div>
                <div>
                  <div className="text-sm text-gray-500">{counter.label}</div>
                  <div className="text-lg font-bold text-gray-800">
                    {counter.value === undefined ? 'Memuat...' : counter.value.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CustomerStats {
  firstTime: number;
  returning: number;
  total: number;
}

export function CustomerOverviewCard() {
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomerStats = useCallback(async () => {
    setError(null);
    try {
      const sales: Sale[] = await api.sales.getAll();
      const customerSales = new Map<string, number>();
      for (const sale of sales) {
        const name = sale.customer_name?.trim().toLocaleLowerCase();
        if (name) customerSales.set(name, (customerSales.get(name) || 0) + 1);
      }

      const counts = Array.from(customerSales.values());
      const firstTime = counts.filter(count => count === 1).length;
      const returning = counts.filter(count => count > 1).length;
      const total = firstTime + returning;
      setStats({
        firstTime: total ? Math.round((firstTime / total) * 100) : 0,
        returning: total ? Math.round((returning / total) * 100) : 0,
        total,
      });
    } catch (err) {
      console.error('Error fetching customer overview:', err);
      setError(err instanceof Error ? err.message : 'Gagal mengambil data pelanggan.');
    }
  }, []);

  useEffect(() => {
    void fetchCustomerStats();
  }, [fetchCustomerStats]);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const firstTimeArc = ((stats?.firstTime || 0) / 100) * circumference;
  const returningArc = ((stats?.returning || 0) / 100) * circumference;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-base font-bold text-gray-800">Ringkasan Pelanggan</h3>
      {error ? (
        <div className="text-sm text-red-700">
          <p>Data tidak dapat dimuat: {error}</p>
          <button onClick={() => void fetchCustomerStats()} className="mt-2 font-semibold underline">Coba lagi</button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="relative mb-4 h-40 w-40">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 150 150">
              <circle cx="75" cy="75" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
              {stats?.total ? (
                <>
                  <circle
                    cx="75" cy="75" r={radius} fill="none" stroke="#f97316" strokeWidth="16"
                    strokeDasharray={`${firstTimeArc} ${circumference}`}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="75" cy="75" r={radius} fill="none" stroke="#0f766e" strokeWidth="16"
                    strokeDasharray={`${returningArc} ${circumference}`}
                    strokeDashoffset={-firstTimeArc}
                    strokeLinecap="round"
                  />
                </>
              ) : null}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-gray-800">
                {stats ? stats.total.toLocaleString('id-ID') : '...'}
              </div>
              <div className="text-xs text-gray-400">Pelanggan bertransaksi</div>
            </div>
          </div>

          {stats?.total ? (
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-orange-50 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-orange-500" />
                  <span className="text-sm text-gray-600">Baru sekali bertransaksi</span>
                </div>
                <span className="text-sm font-bold text-orange-600">{stats.firstTime}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-teal-50 p-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-teal-600" />
                  <span className="text-sm text-gray-600">Pernah bertransaksi kembali</span>
                </div>
                <span className="text-sm font-bold text-teal-600">{stats.returning}%</span>
              </div>
            </div>
          ) : (
            <p className="w-full text-center text-sm text-gray-500">
              {stats ? 'Belum ada data pelanggan pada transaksi.' : 'Memuat data pelanggan...'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
