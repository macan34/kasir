import { useCallback, useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { Sale } from '@/types';

const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function getOrderStatus(sale: Sale) {
  if (sale.payment_status === 'failed') return 'Pembayaran gagal';
  if (sale.payment_status !== 'paid') return 'Menunggu pembayaran Duitku';
  if (sale.order_status === 'pending_approval') return 'Menunggu persetujuan kasir';
  if (sale.order_status === 'approved') return 'Disetujui';
  return sale.order_status || 'Status tidak diketahui';
}

export default function CustomerOrdersPanel() {
  const [orders, setOrders] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [preparingPayment, setPreparingPayment] = useState<string | number | null>(null);

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

  async function preparePayment(order: Sale) {
    setPreparingPayment(order.id);
    setPaymentError(null);
    try {
      const payment = await api.sales.createDuitkuPayment(order.id);
      setOrders(current => current.map(item => String(item.id) === String(order.id)
        ? { ...item, payment_url: payment.payment_url, payment_status: payment.payment_status }
        : item));
      await fetchOrders();
    } catch (err) {
      console.error('Error preparing Duitku payment:', err);
      setPaymentError(err instanceof Error ? err.message : 'Gagal menyiapkan pembayaran Duitku.');
    } finally {
      setPreparingPayment(null);
    }
  }

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pesanan Saya</h2>
          <p className="text-sm text-gray-500">Pesanan diteruskan ke kasir/admin hanya setelah pembayaran Duitku terverifikasi.</p>
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
                  order.payment_url && order.payment_status === 'pending' ? (
                    <a
                      href={order.payment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600"
                    >
                      Lanjutkan Pembayaran
                    </a>
                  ) : (
                    <button
                      onClick={() => void preparePayment(order)}
                      disabled={preparingPayment !== null}
                      className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      {preparingPayment === order.id ? 'Menyiapkan...' : order.payment_status === 'failed' ? 'Ulangi Pembayaran' : 'Siapkan Pembayaran'}
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {paymentError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{paymentError}</div>}
    </section>
  );
}
