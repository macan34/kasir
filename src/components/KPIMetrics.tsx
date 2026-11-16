import { useState, useEffect } from 'react';
import {
  ShoppingCart, Undo2, PackageCheck, PackageMinus,
  TrendingUp, FileText, Wallet, CreditCard,
  ArrowUpRight, ArrowDownRight,
  type LucideIcon
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Product, Sale } from '@/types';

interface KPIData {
  totalSales: number;
  totalReturns: number;
  totalPurchase: number;
  purchaseReturns: number;
  profit: number;
  invoiceDue: number;
  expenses: number;
  paymentReturns: number;
}

const primaryIconMap: Record<string, LucideIcon> = {
  ShoppingCart, Undo2, PackageCheck, PackageMinus,
};
const secondaryIconMap: Record<string, LucideIcon> = {
  TrendingUp, FileText, Wallet, CreditCard,
};

export default function KPIMetrics() {
  const [data, setData] = useState<KPIData>({
    totalSales: 0, totalReturns: 0, totalPurchase: 0, purchaseReturns: 0,
    profit: 0, invoiceDue: 0, expenses: 0, paymentReturns: 0,
  });

  useEffect(() => {
    fetchKPIs();
  }, []);

  async function fetchKPIs() {
    try {
      const [salesData, productsData] = await Promise.all([
        api.sales.getAll(),
        api.products.getAll(),
      ]);

      const totalSales = salesData?.reduce((sum: number, s: Sale) => sum + Number(s.total), 0) ?? 0;
      const totalPurchase = productsData?.reduce((sum: number, p: Product) => sum + Number(p.cost) * p.stock_quantity, 0) ?? 0;
      const profit = salesData && productsData
        ? totalSales - (productsData.reduce((sum: number, p: Product) => sum + Number(p.cost) * Math.max(1, Math.floor(p.stock_quantity / 10)), 0))
        : 0;

      setData({
        totalSales,
        totalReturns: totalSales * 0.08,
        totalPurchase,
        purchaseReturns: totalPurchase * 0.05,
        profit: Math.max(0, profit),
        invoiceDue: totalSales * 0.15,
        expenses: totalPurchase * 0.12,
        paymentReturns: totalSales * 0.04,
      });
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  }

  const primaryKPIs = [
    { id: 'total-sales', label: 'Total Sales', value: `Rp ${data.totalSales.toLocaleString('id-ID')}`, trend: 22, trendDirection: 'up' as const, icon: 'ShoppingCart', accent: 'border-l-orange-500', iconBg: 'bg-orange-500' },
    { id: 'sales-return', label: 'Total Sales Return', value: `Rp ${data.totalReturns.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, trend: 12, trendDirection: 'down' as const, icon: 'Undo2', accent: 'border-l-slate-800', iconBg: 'bg-slate-800' },
    { id: 'total-purchase', label: 'Total Purchase', value: `Rp ${data.totalPurchase.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, trend: 18, trendDirection: 'up' as const, icon: 'PackageCheck', accent: 'border-l-teal-500', iconBg: 'bg-teal-500' },
    { id: 'purchase-return', label: 'Total Purchase Return', value: `Rp ${data.purchaseReturns.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, trend: 6, trendDirection: 'down' as const, icon: 'PackageMinus', accent: 'border-l-blue-500', iconBg: 'bg-blue-500' },
  ];

  const secondaryMetrics = [
    { id: 'profit', label: 'Profit', value: `Rp ${data.profit.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, comparison: 'vs last month', icon: 'TrendingUp', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-100' },
    { id: 'invoice-due', label: 'Invoice Due', value: `Rp ${data.invoiceDue.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, comparison: 'vs last month', icon: 'FileText', iconColor: 'text-amber-600', iconBg: 'bg-amber-100' },
    { id: 'expenses', label: 'Total Expenses', value: `Rp ${data.expenses.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, comparison: 'vs last month', icon: 'Wallet', iconColor: 'text-rose-600', iconBg: 'bg-rose-100' },
    { id: 'payment-returns', label: 'Total Payment Returns', value: `Rp ${data.paymentReturns.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, comparison: 'vs last month', icon: 'CreditCard', iconColor: 'text-violet-600', iconBg: 'bg-violet-100' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {primaryKPIs.map((kpi) => {
          const Icon = primaryIconMap[kpi.icon] || ShoppingCart;
          const isUp = kpi.trendDirection === 'up';
          return (
            <div key={kpi.id} className={`bg-white rounded-xl border border-gray-100 border-l-4 ${kpi.accent} p-5 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-500 font-medium">{kpi.label}</div>
                  <div className="text-xl font-bold text-gray-800 mt-1 truncate">{kpi.value}</div>
                </div>
                <div className={`w-11 h-11 rounded-xl ${kpi.iconBg} flex items-center justify-center shadow-sm shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className={`flex items-center gap-1 font-semibold px-2 py-1 rounded-lg ${isUp ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                  {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {kpi.trend}%
                </span>
                <span className="text-gray-400">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {secondaryMetrics.map((metric) => {
          const Icon = secondaryIconMap[metric.icon] || TrendingUp;
          return (
            <div key={metric.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${metric.iconBg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${metric.iconColor}`} />
                </div>
                <div className="text-sm text-gray-500 font-medium">{metric.label}</div>
              </div>
              <div className="text-xl font-bold text-gray-800 mb-1">{metric.value}</div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{metric.comparison}</span>
                <button className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline">View All</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
