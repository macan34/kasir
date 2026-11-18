import { useCallback, useEffect, useState } from 'react';
import { Loader2, QrCode, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function getOrderStatus(sale: Sale) {
  if (sale.payment_status !== 'paid') return 'Menunggu pembayaran QRIS';
  if (sale.order_status === 'pending_approval') return 'Menunggu persetujuan kasir';
  if (sale.order_status === 'approved') return 'Disetujui';
  return sale.order_status || 'Status tidak diketahui';
}

export default function CustomerOrdersPanel() {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [payingOrder, setPayingOrder] = useState<Sale | null>(null);
  const [paying, setPaying] = useState(false);

  const fetchOrders = useCallback(async () => {
    setError(null);
    try {
      setOrders(await api.sales.getMyOrders());
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat pesanan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
    const handleOrdersUpdated = () => { void fetchOrders(); };
    window.addEventListener('retaillet:customer-orders-updated', handleOrdersUpdated);
    const intervalId = window.setInterval(() => { void fetchOrders(); }, 15000);
    return () => {
      window.removeEventListener('retaillet:customer-orders-updated', handleOrdersUpdated);
      window.clearInterval(intervalId);
    };
  }, [fetchOrders]);

  async function confirmDummyPayment() {
    if (!payingOrder) return;
    setPaying(true);
    setPaymentError(null);
    try {
      await api.sales.payDummy(payingOrder.id);
      setPayingOrder(null);
      await fetchOrders();
    } catch (err) {
      console.error('Error confirming dummy QRIS payment:', err);
      setPaymentError(err instanceof Error ? err.message : 'Pembayaran simulasi gagal.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pesanan Saya</h2>
          <p className="text-sm text-gray-500">Pesanan hanya dikirim ke kasir/admin setelah pembayaran QRIS dummy dikonfirmasi.</p>
        </div>
        <button
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Perbarui
        </button>
      </div>

      {error && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat pesanan...
        </div>
      ) : orders.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">Belum ada pesanan.</p>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="flex flex-col gap-3 rounded-lg border border-gray-100 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-sm font-bold text-orange-600">{order.invoice_number}</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' · '}{Number(order.item_count || 0)} barang
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{currency.format(Number(order.total))}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  order.payment_status === 'paid' && order.order_status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : order.payment_status === 'paid'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {getOrderStatus(order)}
                </span>
                {order.payment_status !== 'paid' && order.order_status === 'awaiting_payment' && (
                  <button
                    onClick={() => { setPayingOrder(order); setPaymentError(null); }}
                    className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                  >
                    Bayar QRIS Dummy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {payingOrder && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={() => !paying && setPayingOrder(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <QrCode className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Pembayaran QRIS Dummy</h3>
                <p className="text-xs text-gray-500">{payingOrder.invoice_number}</p>
              </div>
            </div>
            <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-5 text-center">
              <p className="text-xs font-bold tracking-widest text-orange-700">QRIS SIMULASI</p>
              <p className="mt-2 text-2xl font-bold text-gray-800">{currency.format(Number(payingOrder.total))}</p>
              <p className="mt-1 break-all font-mono text-xs text-gray-500">REF-{payingOrder.invoice_number}</p>
            </div>
            <p className="my-4 text-xs leading-relaxed text-gray-500">
              Ini hanya simulasi lokal, bukan QR pembayaran sungguhan dan tidak memotong saldo. Setelah dikonfirmasi, pesanan diteruskan ke kasir/admin.
            </p>
            {paymentError && <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{paymentError}</div>}
            <div className="flex gap-2">
              <button
                onClick={() => setPayingOrder(null)}
                disabled={paying}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Nanti
              </button>
              <button
                onClick={() => void confirmDummyPayment()}
                disabled={paying}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {paying ? 'Memproses...' : 'Simulasikan Pembayaran'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
