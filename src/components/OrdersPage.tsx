import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, Loader2, RefreshCw, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Sale, SaleItem } from '@/types';

type OrderDetails = Sale & { items: SaleItem[] };

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export default function OrdersPage() {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [approving, setApproving] = useState(false);

  const fetchOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      setOrders(await api.sales.getOrders());
    } catch (err) {
      console.error('Error fetching orders awaiting approval:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
    const intervalId = window.setInterval(() => { void fetchOrders(false); }, 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchOrders]);

  async function showDetails(order: Sale) {
    setLoadingDetails(true);
    setError(null);
    setSelectedOrder(null);
    try {
      setSelectedOrder(await api.sales.getById(order.id));
    } catch (err) {
      console.error('Error loading order details:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat rincian pesanan.');
    } finally {
      setLoadingDetails(false);
    }
  }

  async function approveSelectedOrder() {
    if (!selectedOrder) return;
    setApproving(true);
    setError(null);
    try {
      await api.sales.approveOrder(selectedOrder.id);
      setSelectedOrder(null);
      setNotice(`Pesanan ${selectedOrder.invoice_number} disetujui.`);
      await fetchOrders();
    } catch (err) {
      console.error('Error approving order:', err);
      setError(err instanceof Error ? err.message : 'Gagal menyetujui pesanan.');
    } finally {
      setApproving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Persetujuan Pesanan</h1>
          <p className="text-sm text-gray-500">Hanya pesanan yang sudah dibayar dan terverifikasi Duitku yang masuk ke daftar ini.</p>
        </div>
        <button
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Perbarui
        </button>
      </div>

      {notice && (
        <div role="status" className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {notice}
          <button onClick={() => setNotice(null)} aria-label="Tutup notifikasi"><X className="h-4 w-4" /></button>
        </div>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat pesanan...
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <ClipboardList className="mx-auto mb-2 h-10 w-10 opacity-40" />
            Belum ada pesanan yang menunggu persetujuan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">No. Pesanan</th>
                  <th className="px-4 py-3 font-semibold">Waktu</th>
                  <th className="px-4 py-3 font-semibold">Pelanggan</th>
                  <th className="px-4 py-3 text-center font-semibold">Barang</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-center font-semibold">Status</th>
                  <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50/60">
                    <td className="px-4 py-3 font-mono font-semibold text-orange-600">{order.invoice_number}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{order.customer_name || 'Pelanggan Umum'}</td>
                    <td className="px-4 py-3 text-center">{Number(order.item_count || 0)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-800">{currency.format(Number(order.total))}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                        Sudah dibayar
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => void showDetails(order)}
                        className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
                      >
                        Lihat & setujui
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {loadingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-white px-5 py-4 text-sm text-gray-600">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> Memuat rincian pesanan...
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !approving && setSelectedOrder(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-800">Rincian Pesanan</h2>
                <p className="font-mono text-sm text-orange-600">{selectedOrder.invoice_number}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} disabled={approving} aria-label="Tutup">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="mb-4 max-h-64 space-y-2 overflow-y-auto">
              {selectedOrder.items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{item.product_name}</p>
                    <p className="text-xs text-gray-500">{item.quantity} × {currency.format(Number(item.unit_price))}</p>
                  </div>
                  <span className="font-semibold text-gray-700">{currency.format(Number(item.line_total))}</span>
                </div>
              ))}
            </div>

            <div className="mb-4 flex justify-between border-t border-gray-200 pt-3 font-bold">
              <span>Total dibayar</span>
              <span>{currency.format(Number(selectedOrder.total))}</span>
            </div>
            {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
            <button
              onClick={() => void approveSelectedOrder()}
              disabled={approving || selectedOrder.payment_status !== 'paid' || selectedOrder.order_status !== 'pending_approval'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {approving ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {approving ? 'Menyetujui...' : 'Setujui Pesanan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
