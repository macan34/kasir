import React, { useState, useEffect, useMemo } from 'react';
import { Search, Printer, Loader2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import type { Sale, Store } from '@/types';
import ThermalReceipt, { type ReceiptData } from './ThermalReceipt';

interface TransactionsPageProps {
  store: Store | null;
}

export default function TransactionsPage({ store }: TransactionsPageProps) {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [fetchingDetail, setFetchingDetail] = useState(false);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    setLoading(true);
    try {
      const data = await api.sales.getAll();
      if (data) setSales(data);
    } catch (err) {
      console.error('Error fetching sales:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const matchInv = s.invoice_number.toLowerCase().includes(search.toLowerCase());
      const matchCust = (s.customer_name || '').toLowerCase().includes(search.toLowerCase());
      return matchInv || matchCust;
    });
  }, [sales, search]);

  async function handlePrintReceipt(saleId: number | string) {
    setFetchingDetail(true);
    try {
      const detail = await api.sales.getById(saleId);
      const detailItems: ReceiptData['items'] = detail.items || [];
      const mergedItems = detailItems.reduce<Record<string, ReceiptData['items'][number]>>((acc, item) => {
        const key = `${item.product_name.trim()}::${item.unit_price}`;
        const existing = acc[key];

        if (existing) {
          existing.quantity += item.quantity;
          existing.line_total = existing.quantity * existing.unit_price;
        } else {
          acc[key] = { ...item, line_total: item.quantity * item.unit_price };
        }

        return acc;
      }, {});

      const receiptData: ReceiptData = {
        invoice_number: detail.invoice_number,
        created_at: detail.created_at,
        store_name: 'RETAILED POSS',
        store_address: '',
        customer_name: detail.customer_name || 'Pelanggan Umum',
        cashier_name: 'Admin Kasir',
        items: Object.values(mergedItems),
        subtotal: detail.subtotal || detail.total,
        tax_amount: detail.tax_amount || 0,
        discount_amount: detail.discount_amount || 0,
        total: detail.total,
        payment_method: detail.payment_method || 'cash',
        amount_paid: detail.total,
        change_amount: 0,
      };
      setSelectedReceipt(receiptData);
    } catch (err) {
      console.error('Failed to get transaction detail for print:', err);
    } finally {
      setFetchingDetail(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Riwayat Transaksi Penjualan</h1>
          <p className="text-sm text-gray-500">
            {filteredSales.length} transaksi tercatat di database lokal (Siap Cetak Epson TM-T82X)
          </p>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari no nota / nama pelanggan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">No. Nota</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Tanggal & Jam</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Pelanggan</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Metode Bayar</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Total Belanja</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Aksi Cetak</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Belum ada transaksi ditemukan
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-orange-600">{sale.invoice_number}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(sale.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{sale.customer_name || 'Pelanggan Umum'}</td>
                    <td className="px-4 py-3 text-xs uppercase font-semibold text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-gray-100">{sale.payment_method}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">
                      Rp {sale.total.toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handlePrintReceipt(sale.id)}
                        disabled={fetchingDetail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold rounded-lg transition-colors border border-orange-200"
                        title="Cetak Struk Thermal Epson TM-T82X"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Cetak Struk</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cetak Struk Thermal */}
      {selectedReceipt && (
        <ThermalReceipt
          data={selectedReceipt}
          store={store}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
