import { useState, useEffect } from 'react';
import { Users, ShoppingBag, Boxes, TrendingUp, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

export function OverallInfoCard() {
  const [counts, setCounts] = useState({ suppliers: 10, customers: 0, orders: 0 });

  useEffect(() => {
    Promise.all([
      api.sales.getAll(),
      api.sales.getCustomers(),
    ]).then(([sales, customers]) => {
      setCounts({
        suppliers: 10,
        customers: customers ? customers.length : 0,
        orders: sales ? sales.length : 0,
      });
    }).catch(err => console.error('Error fetching overall info:', err));
  }, []);

  const counters = [
    { icon: Boxes, label: 'Suppliers/Branches', value: counts.suppliers.toString(), color: 'text-teal-600', bg: 'bg-teal-100' },
    { icon: Users, label: 'Customers', value: counts.customers.toString(), color: 'text-blue-600', bg: 'bg-blue-100' },
    { icon: ShoppingBag, label: 'Total Orders', value: counts.orders.toString(), color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-800 mb-4">Overall Information</h3>
      <div className="space-y-3">
        {counters.map((c) => (
          <div key={c.label} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div>
                <div className="text-sm text-gray-500">{c.label}</div>
                <div className="text-lg font-bold text-gray-800">{c.value}</div>
              </div>
            </div>
            <button className="text-gray-300 hover:text-gray-500 transition-colors">
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerOverviewCard() {
  const [stats, setStats] = useState({ firstTime: 35, returning: 65, total: 0 });

  useEffect(() => {
    api.sales.getAll().then((data: Sale[]) => {
      if (!data) return;
      const nameCounts: Record<string, number> = {};
      data.forEach((s: Sale) => {
        const name = s.customer_name;
        if (name) nameCounts[name] = (nameCounts[name] || 0) + 1;
      });
      const firstTime = Object.values(nameCounts).filter(c => c === 1).length;
      const returning = Object.values(nameCounts).filter(c => c > 1).length;
      const total = firstTime + returning;
      if (total > 0) {
        setStats({
          firstTime: Math.round((firstTime / total) * 100),
          returning: Math.round((returning / total) * 100),
          total,
        });
      }
    }).catch(err => console.error('Error fetching customer overview:', err));
  }, []);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const firstTimeArc = (stats.firstTime / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-800 mb-4">Customer Overview</h3>
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40 mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 150 150">
            <circle cx="75" cy="75" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="16" />
            <circle
              cx="75" cy="75" r={radius} fill="none" stroke="#f97316" strokeWidth="16"
              strokeDasharray={`${firstTimeArc} ${circumference}`}
              strokeLinecap="round"
            />
            <circle
              cx="75" cy="75" r={radius} fill="none" stroke="#0f766e" strokeWidth="16"
              strokeDasharray={`${(stats.returning / 100) * circumference} ${circumference}`}
              strokeDashoffset={-firstTimeArc}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold text-gray-800">{stats.total || '—'}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-sm text-gray-600">First-Time</span>
            </div>
            <span className="text-sm font-bold text-orange-600">{stats.firstTime}%</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-teal-50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-teal-600" />
              <span className="text-sm text-gray-600">Returning</span>
            </div>
            <span className="text-sm font-bold text-teal-600">{stats.returning}%</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 mt-4 text-sm">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-gray-500">Customer growth</span>
          <span className="font-bold text-emerald-600">+12%</span>
        </div>
      </div>
    </div>
  );
}
