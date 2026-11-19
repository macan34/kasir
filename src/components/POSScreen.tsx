import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, CreditCard, Barcode,
  Banknote, Wallet, Receipt, CheckCircle2, Loader2, Package, Printer
} from 'lucide-react';
import { api, type CustomerRecord } from '@/lib/api';
import type { Product, Category, CartItem, Store } from '@/types';
import ThermalReceipt, { type ReceiptData } from './ThermalReceipt';

interface POSScreenProps {
  store: Store | null;
  mode?: 'cashier' | 'customer';
  customerName?: string;
  cashierName?: string;
}

interface PendingPayment {
  id: string | number;
  invoice_number: string;
  total: number;
  payment_method: string;
  payment_url: string | null;
}

export default function POSScreen({
  store,
  mode = 'cashier',
  customerName: initialCustomerName = '',
  cashierName = 'Admin Kasir',
}: POSScreenProps) {
  const isCustomer = mode === 'customer';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | number>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState(initialCustomerName);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'qris' | 'va'>(isCustomer ? 'qris' : 'cash');
  const [customerEmail, setCustomerEmail] = useState('');
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [completedReceiptData, setCompletedReceiptData] = useState<ReceiptData | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [paymentSetupError, setPaymentSetupError] = useState<string | null>(null);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memberCustomers, setMemberCustomers] = useState<CustomerRecord[]>([]);
  const [memberDiscountDefault, setMemberDiscountDefault] = useState(0);
  const [memberCardCode, setMemberCardCode] = useState('');
  const [memberScanStatus, setMemberScanStatus] = useState('');
  const [productScanCode, setProductScanCode] = useState('');
  const [productScanStatus, setProductScanStatus] = useState<{ message: string; success: boolean } | null>(null);
  const memberCardInputRef = useRef<HTMLInputElement>(null);
  const productBarcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
    if (!isCustomer) {
      Promise.all([api.customers.getAll(), api.customers.getMemberSettings()])
        .then(([customers, settings]) => {
          setMemberCustomers(customers);
          setMemberDiscountDefault(settings.default_member_discount);
        })
        .catch((err: unknown) => {
          console.error('Failed to load member card data:', err);
          setError(err instanceof Error ? err.message : 'Gagal memuat data kartu member.');
        });
    }
  }, [isCustomer]);

  useEffect(() => {
    if (!loading) productBarcodeInputRef.current?.focus();
  }, [loading]);

  useEffect(() => {
    if (!pendingPayment) return;
    const activePayment = pendingPayment;
    let active = true;

    async function checkPaymentStatus() {
      try {
        const status = await api.sales.getPaymentStatus(activePayment.id);
        if (!active || status.payment_status !== 'paid') {
          if (active && status.payment_status === 'failed') {
            setPaymentSetupError('Pembayaran gagal. Silakan coba tautan pembayaran lagi atau hubungi kasir.');
          }
          return;
        }

        if (isCustomer) {
          setPendingPayment(null);
          window.dispatchEvent(new Event('retaillet:customer-orders-updated'));
          return;
        }

        const sale = await api.sales.getById(activePayment.id);
        if (!active) return;
        setCompletedReceiptData({
          invoice_number: sale.invoice_number,
          created_at: sale.created_at,
          store_name: 'RETAILED POSS',
          store_address: '',
          customer_name: sale.customer_name || 'Pelanggan Umum',
          cashier_name: cashierName,
          items: sale.items.map(item => ({
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: Number(item.unit_price),
            line_total: Number(item.line_total),
          })),
          subtotal: Number(sale.subtotal),
          tax_amount: Number(sale.tax_amount),
          discount_amount: Number(sale.discount_amount),
          total: Number(sale.total),
          payment_method: sale.payment_method,
          amount_paid: Number(sale.total),
          change_amount: 0,
        });
        setPendingPayment(null);
      } catch (err) {
        console.error('Error checking Duitku payment status:', err);
      }
    }

    void checkPaymentStatus();
    const intervalId = window.setInterval(() => { void checkPaymentStatus(); }, 4000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pendingPayment, isCustomer, cashierName]);

  async function fetchData() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.products.getAll(),
        api.categories.getAll(),
      ]);
      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
    } catch (err: unknown) {
      console.error('Error fetching POS data:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data POS.');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || String(p.category_id) === String(activeCategory);
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  const memberLookup = useMemo(() => {
    const trimmed = memberCardCode.trim().toLowerCase();
    if (!trimmed) return null;

    return memberCustomers.find((customer) => {
      const ref = (customer.member_ref || '').trim().toLowerCase();
      return Boolean(customer.is_member) && ref === trimmed;
    }) || null;
  }, [memberCardCode, memberCustomers]);

  const memberDiscountPercentage = memberLookup
    ? Number(memberLookup.member_discount) > 0
      ? Number(memberLookup.member_discount)
      : memberDiscountDefault
    : 0;

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const taxAmount = Math.round(subtotal * 0.11); // PPN 11%
  const memberDiscountAmount = memberLookup && memberDiscountPercentage > 0
    ? Math.min(Math.round(subtotal * (memberDiscountPercentage / 100)), subtotal)
    : 0;
  const discountAmount = Math.min(discount + memberDiscountAmount, subtotal);
  const total = subtotal + taxAmount - discountAmount;
  const cashGiven = typeof amountPaid === 'number' ? amountPaid : total;
  const changeAmount = Math.max(0, cashGiven - total);
  const isDuitkuPayment = ['qris', 'va', 'card'].includes(paymentMethod);

  function addToCart(product: Product) {
    if (product.stock_quantity <= 0) return;
    setCart(prev => {
      const existing = prev.find(i => String(i.product.id) === String(product.id));
      if (existing) {
        if (existing.quantity >= product.stock_quantity) return prev;
        return prev.map(i => String(i.product.id) === String(product.id) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: number | string, delta: number) {
    setCart(prev => {
      return prev.map(item => {
        if (String(item.product.id) !== String(productId)) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stock_quantity) return item;
        return { ...item, quantity: newQty };
      }).filter(item => item.quantity > 0);
    });
  }

  function removeFromCart(productId: number | string) {
    setCart(prev => prev.filter(i => String(i.product.id) !== String(productId)));
  }

  function scanProductBarcode(value: string) {
    const code = value.trim();
    if (!code) return;

    const normalizedCode = code.toLowerCase();
    const product = products.find(item =>
      (item.barcode || '').trim().toLowerCase() === normalizedCode ||
      item.sku.trim().toLowerCase() === normalizedCode
    );

    if (!product) {
      setProductScanStatus({ message: `Barcode "${code}" belum terdaftar pada produk.`, success: false });
      setProductScanCode('');
      productBarcodeInputRef.current?.focus();
      return;
    }

    if (product.stock_quantity <= 0) {
      setProductScanStatus({ message: `${product.name} stoknya habis.`, success: false });
      setProductScanCode('');
      productBarcodeInputRef.current?.focus();
      return;
    }

    const cartItem = cart.find(item => String(item.product.id) === String(product.id));
    if (cartItem && cartItem.quantity >= product.stock_quantity) {
      setProductScanStatus({ message: `Stok ${product.name} tidak mencukupi.`, success: false });
      setProductScanCode('');
      productBarcodeInputRef.current?.focus();
      return;
    }

    addToCart(product);
    setProductScanStatus({ message: `${product.name} ditambahkan ke keranjang.`, success: true });
    setProductScanCode('');
    productBarcodeInputRef.current?.focus();
  }

  function clearCart() {
    setCart([]);
    setCustomerName(isCustomer ? initialCustomerName : '');
    setMemberCardCode('');
    setMemberScanStatus('');
    setProductScanCode('');
    setProductScanStatus(null);
    setDiscount(0);
    setAmountPaid('');
  }

  function handleMemberCardInput(value: string) {
    const code = value.trim();
    setMemberCardCode(code);
    setError(null);

    const customer = memberCustomers.find((item) =>
      Boolean(item.is_member) && (item.member_ref || '').trim().toLowerCase() === code.toLowerCase()
    );
    if (customer) {
      setCustomerName(customer.name);
      setMemberScanStatus(`Kartu terverifikasi: ${customer.name}`);
    } else {
      setCustomerName('');
      setMemberScanStatus(code ? 'Kode belum terdaftar sebagai kartu member aktif.' : '');
    }
  }

  async function processSale() {
    if (cart.length === 0) return;
    if (isCustomer && !customerName.trim()) {
      setError('Nama pelanggan wajib diisi.');
      return;
    }
    const isOnlinePayment = ['qris', 'va', 'card'].includes(paymentMethod);
    if (isOnlinePayment && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      setError('Masukkan alamat email yang valid untuk pembayaran Duitku.');
      return;
    }
    setProcessing(true);
    setError(null);
    setPaymentSetupError(null);

    const invoiceNumber = `INV-${Date.now().toString().slice(-8)}`;
    const finalPaid = typeof amountPaid === 'number' && amountPaid > 0 ? amountPaid : total;
    let onlineSale: { id: string | number; invoice_number: string } | null = null;

    try {
      const saleData = await api.sales.create({
        invoice_number: invoiceNumber,
        store_id: store?.id ?? null,
        customer_name: memberLookup?.name || customerName || null,
        subtotal: subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total: total,
        payment_method: paymentMethod,
        payment_status: isCustomer ? 'pending' : 'paid',
      });

      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        line_total: item.product.price * item.quantity,
      }));

      await api.saleItems.createMany(saleItems);

      if (isOnlinePayment) {
        onlineSale = { id: saleData.id, invoice_number: invoiceNumber };
        setPendingPayment({
          id: saleData.id,
          invoice_number: invoiceNumber,
          total,
          payment_method: paymentMethod,
          payment_url: null,
        });
        setProcessing(false);
        setCheckoutOpen(false);
        clearCart();
        if (isCustomer) window.dispatchEvent(new Event('retaillet:customer-orders-updated'));
        const payment = await api.sales.createDuitkuPayment(saleData.id, customerEmail.trim());
        setPendingPayment(current => current && String(current.id) === String(saleData.id)
          ? { ...current, payment_url: payment.payment_url }
          : current);
        return;
      }

      // Prepare complete receipt data for Epson TM-T82X
      const mergedReceiptItems = cart.reduce<Record<string, ReceiptData['items'][number]>>((acc, item) => {
        const key = `${item.product.name.trim()}::${item.product.price}`;
        const existing = acc[key];

        if (existing) {
          existing.quantity += item.quantity;
          existing.line_total = existing.quantity * existing.unit_price;
        } else {
          acc[key] = {
            product_name: item.product.name,
            quantity: item.quantity,
            unit_price: item.product.price,
            line_total: item.product.price * item.quantity,
          };
        }

        return acc;
      }, {});

      const receipt: ReceiptData = {
        invoice_number: invoiceNumber,
        created_at: new Date().toISOString(),
        store_name: 'RETAILED POSS',
        store_address: '',
        customer_name: memberLookup?.name || customerName || 'Pelanggan Umum',
        cashier_name: isCustomer ? customerName : cashierName,
        items: Object.values(mergedReceiptItems),
        subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        total,
        payment_method: paymentMethod,
        amount_paid: finalPaid,
        change_amount: Math.max(0, finalPaid - total),
      };

      setCompletedReceiptData(receipt);
      setProcessing(false);
      setCheckoutOpen(false);
      clearCart();
      await fetchData();
    } catch (err: unknown) {
      console.error('Process sale error:', err);
      if (onlineSale) {
        setPaymentSetupError(err instanceof Error ? err.message : 'Gagal membuat pembayaran Duitku.');
      } else {
        setError(err instanceof Error ? err.message : 'Gagal menyelesaikan transaksi');
      }
      setProcessing(false);
    }
  }

  async function retryDuitkuPayment() {
    if (!pendingPayment) return;
    setProcessing(true);
    setPaymentSetupError(null);
    try {
      const payment = await api.sales.createDuitkuPayment(pendingPayment.id);
      setPendingPayment(current => current && String(current.id) === String(pendingPayment.id)
        ? { ...current, payment_url: payment.payment_url }
        : current);
    } catch (err) {
      console.error('Error retrying Duitku payment:', err);
      setPaymentSetupError(err instanceof Error ? err.message : 'Gagal membuat pembayaran Duitku.');
    } finally {
      setProcessing(false);
    }
  }

  const paymentMethods = [
    { id: 'cash', label: 'Tunai (Cash)', icon: Banknote },
    { id: 'qris', label: 'QRIS (Duitku)', icon: Wallet },
    { id: 'va', label: 'Virtual Account', icon: Receipt },
    { id: 'card', label: 'Kartu (Duitku)', icon: CreditCard },
  ] as const;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
      {/* Product selection area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search + categories */}
        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk berdasarkan nama atau SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              Semua Kategori
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Package className="w-12 h-12 mb-2" />
              <p className="text-sm">Produk tidak ditemukan</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {filteredProducts.map(product => {
                const outOfStock = product.stock_quantity <= 0;
                const lowStock = product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    disabled={outOfStock}
                    className={`relative bg-white rounded-xl border p-3 text-left transition-all group ${outOfStock ? 'opacity-50 cursor-not-allowed border-gray-100' : 'border-gray-100 hover:border-orange-300 hover:shadow-md cursor-pointer'}`}
                  >
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-2 overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="text-sm font-semibold text-gray-800 line-clamp-2 leading-tight mb-1">{product.name}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-orange-600 font-bold text-sm">Rp {product.price.toLocaleString('id-ID')}</span>
                      <span className={`text-xs font-medium ${outOfStock ? 'text-red-500' : lowStock ? 'text-amber-500' : 'text-gray-400'}`}>
                        {outOfStock ? 'Habis' : isCustomer ? 'Tersedia' : `${product.stock_quantity} ${product.unit}`}
                      </span>
                    </div>
                    {!isCustomer && lowStock && !outOfStock && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart panel */}
      <div className="lg:w-[380px] flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-gray-800">Keranjang</h3>
            {cartCount > 0 && <span className="text-xs font-bold text-white bg-orange-500 px-2 py-0.5 rounded-full">{cartCount}</span>}
          </div>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 font-medium">Hapus</button>
          )}
        </div>

        {!isCustomer && <div className="p-3 border-b border-gray-100 space-y-2">
          <label htmlFor="pos-product-barcode" className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
            <Barcode className="w-4 h-4 text-orange-500" /> Scan Barcode Produk
          </label>
          <div className="flex gap-2">
            <input
              id="pos-product-barcode"
              ref={productBarcodeInputRef}
              type="text"
              inputMode="none"
              autoComplete="off"
              placeholder="Klik Siapkan, lalu scan produk"
              value={productScanCode}
              onChange={e => setProductScanCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  scanProductBarcode(e.currentTarget.value);
                }
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
            />
            <button
              type="button"
              onClick={() => {
                setProductScanStatus({ message: 'Scanner siap. Scan barcode produk sekarang.', success: true });
                productBarcodeInputRef.current?.focus();
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
            >
              Siapkan
            </button>
          </div>
          <p className="text-[11px] text-gray-500">Scanner harus mengirim Enter setelah membaca kode.</p>
          {productScanStatus && (
            <div className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${productScanStatus.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {productScanStatus.message}
            </div>
          )}
        </div>}

        {/* Member card and customer */}
        {!isCustomer && <div className="p-3 border-b border-gray-100 space-y-2">
          <div className="flex gap-2">
            <input
              ref={memberCardInputRef}
              type="text"
              placeholder="Tap kartu / scan kode member"
              value={memberCardCode}
              onChange={e => handleMemberCardInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && memberCardCode.trim()) {
                  e.preventDefault();
                  setMemberScanStatus(
                    memberLookup
                      ? `Kartu terverifikasi: ${memberLookup.name}`
                      : 'Kode kartu tidak ditemukan atau member tidak aktif.'
                  );
                }
              }}
              autoComplete="off"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
            />
            <button
              type="button"
              onClick={() => {
                setMemberScanStatus('Reader siap. Tap kartu atau scan sekarang.');
                memberCardInputRef.current?.focus();
              }}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white whitespace-nowrap"
            >
              Siapkan Scan
            </button>
          </div>
          <input
            type="text"
            placeholder="Nama pelanggan (opsional)"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
          />
          <p className="text-[11px] text-gray-500">Reader harus mengirim kode kartu seperti input keyboard. REF kartu harus didaftarkan di menu Pelanggan.</p>
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">{error}</div>}
          {memberScanStatus && (
            <div className={`rounded-lg border px-2.5 py-1.5 text-[11px] ${memberLookup ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {memberScanStatus}
            </div>
          )}
          {memberLookup && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-700">
              <span className="font-bold">Member aktif:</span> {memberLookup.name} • REF {memberLookup.member_ref || '—'} • Diskon {memberDiscountPercentage}%
            </div>
          )}
        </div>}

        {/* Cart items */}
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300">
              <ShoppingCart className="w-10 h-10 mb-2" />
              <p className="text-sm">Keranjang kosong</p>
              <p className="text-xs">Pilih produk untuk menambahkan ke keranjang</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{item.product.name}</div>
                    <div className="text-xs text-gray-400">Rp {item.product.price.toLocaleString('id-ID')} x {item.quantity}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateQty(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-right w-20">
                    <div className="text-sm font-bold text-gray-800">Rp {(item.product.price * item.quantity).toLocaleString('id-ID')}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals + checkout */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-medium text-gray-700">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>PPN (11%)</span>
                <span className="font-medium text-gray-700">Rp {taxAmount.toLocaleString('id-ID')}</span>
              </div>
              {memberDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon Member</span>
                  <span className="font-medium">-Rp {memberDiscountAmount.toLocaleString('id-ID')}</span>
                </div>
              )}
              {!isCustomer && <div className="flex justify-between items-center text-gray-500">
                  <span>Diskon Manual</span>
                  <input
                    type="number"
                    min={0}
                    value={discount || ''}
                    onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="0"
                    className="w-24 px-2 py-1 text-right text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                  />
              </div>}
              <div className="flex justify-between pt-2 border-t border-gray-100">
                <span className="font-bold text-gray-800">Total Bayar</span>
                <span className="font-bold text-orange-600 text-lg">Rp {total.toLocaleString('id-ID')}</span>
              </div>
            </div>
            <button
              onClick={() => {
                setAmountPaid(total);
                setCheckoutOpen(true);
              }}
              className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" /> {isCustomer ? 'Buat Pesanan' : 'Bayar / Checkout'}
            </button>
          </div>
        )}
      </div>

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCheckoutOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{isCustomer ? 'Konfirmasi Pesanan' : 'Pembayaran'}</h3>
              <button onClick={() => setCheckoutOpen(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">{isCustomer ? 'Pembayaran' : 'Metode Pembayaran'}</label>
                <div className={`grid gap-2 ${isCustomer ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'}`}>
                  {(isCustomer ? paymentMethods.filter(pm => ['qris', 'va'].includes(pm.id)) : paymentMethods).map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl border-2 transition-all ${paymentMethod === pm.id ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                    >
                      <pm.icon className="w-5 h-5" />
                      <span className="text-[11px] font-medium text-center">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {isDuitkuPayment && (
                <div>
                  <label htmlFor="duitku-customer-email" className="text-sm font-medium text-gray-700 mb-1 block">Email untuk pembayaran</label>
                  <input
                    id="duitku-customer-email"
                    type="email"
                    required
                    value={customerEmail}
                    onChange={event => setCustomerEmail(event.target.value)}
                    placeholder="nama@email.com"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                </div>
              )}

              {/* Input Nominal Bayar */}
              {!isCustomer && paymentMethod === 'cash' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Uang Diterima (Rp)</label>
                  <input
                    type="number"
                    min={total}
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                    placeholder={total.toString()}
                    className="w-full px-3 py-2 text-base font-bold text-gray-800 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  {/* Quick cash buttons */}
                  <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
                    {[total, 50000, 100000, 200000, 500000].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmountPaid(val)}
                        className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 whitespace-nowrap"
                      >
                        {val === total ? 'Uang Pas' : `Rp ${val.toLocaleString('id-ID')}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Rincian Ringkas */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>Rp {subtotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-gray-500"><span>PPN (11%)</span><span>Rp {taxAmount.toLocaleString('id-ID')}</span></div>
                {memberDiscountAmount > 0 && <div className="flex justify-between text-gray-500"><span>Diskon Member</span><span>-Rp {memberDiscountAmount.toLocaleString('id-ID')}</span></div>}
                {discount > 0 && <div className="flex justify-between text-gray-500"><span>Diskon Manual</span><span>-Rp {discount.toLocaleString('id-ID')}</span></div>}
                {discountAmount > 0 && <div className="flex justify-between text-gray-500"><span>Diskon Total</span><span>-Rp {discountAmount.toLocaleString('id-ID')}</span></div>}
                <div className="flex justify-between pt-2 border-t border-gray-200 text-base font-bold">
                  <span className="text-gray-800">Total Tagihan</span>
                  <span className="text-orange-600">Rp {total.toLocaleString('id-ID')}</span>
                </div>
                {!isCustomer && paymentMethod === 'cash' && typeof amountPaid === 'number' && (
                  <div className="flex justify-between pt-1 border-t border-gray-200 text-sm font-semibold">
                    <span className="text-gray-600">Kembalian</span>
                    <span className={changeAmount >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                      Rp {changeAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}

              <button
                onClick={processSale}
                disabled={processing || (!isCustomer && paymentMethod === 'cash' && typeof amountPaid === 'number' && amountPaid < total)}
                className="w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <><Loader2 className="w-5 h-5 animate-spin" /> Memproses...</> : <><CheckCircle2 className="w-5 h-5" /> {isDuitkuPayment ? 'Lanjutkan ke Pembayaran Duitku' : 'Selesaikan & Siap Cetak'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
              <Wallet className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="mb-1 text-lg font-bold text-gray-800">Menunggu Pembayaran Duitku</h3>
            <p className="mb-2 font-mono text-sm text-orange-600">{pendingPayment.invoice_number}</p>
            <p className="mb-4 text-sm text-gray-600">
              {pendingPayment.payment_method === 'qris' ? 'QRIS' : pendingPayment.payment_method === 'va' ? 'Virtual Account' : 'Kartu'} ·{' '}
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pendingPayment.total)}
              . Nota hanya tersedia setelah pembayaran terverifikasi.
            </p>
            {paymentSetupError && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-left text-sm text-red-700">{paymentSetupError}</p>}
            {pendingPayment.payment_url ? (
              <a
                href={pendingPayment.payment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 flex w-full items-center justify-center rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600"
              >
                Buka Pembayaran Duitku
              </a>
            ) : null}
            {(!pendingPayment.payment_url || paymentSetupError) && (
              <button
                onClick={() => void retryDuitkuPayment()}
                disabled={processing}
                className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                Coba Siapkan Pembayaran Lagi
              </button>
            )}
            <p className="text-xs text-gray-500">Status diperbarui otomatis. Jangan buat pesanan baru sebelum pembayaran ini selesai.</p>
          </div>
        </div>
      )}

      {/* Sale Success Notification Modal */}
      {completedReceiptData && !showThermalModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setCompletedReceiptData(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{isCustomer ? 'Pesanan Berhasil Dibuat!' : 'Transaksi Berhasil!'}</h3>
            <p className="text-sm text-gray-500 mb-3">{completedReceiptData.invoice_number}</p>
            <div className="bg-gray-50 rounded-xl py-3 px-4 mb-4 text-left space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>{isCustomer ? 'Total Pesanan:' : 'Total Bayar:'}</span>
                <span className="font-bold text-gray-800">Rp {completedReceiptData.total.toLocaleString('id-ID')}</span>
              </div>
              {!isCustomer && <div className="flex justify-between text-xs text-gray-500">
                <span>Kembalian:</span>
                <span className="font-bold text-emerald-600">Rp {(completedReceiptData.change_amount || 0).toLocaleString('id-ID')}</span>
              </div>}
            </div>
            {isCustomer && <p className="mb-4 text-xs text-gray-500">Pembayaran dilakukan di toko saat mengambil pesanan.</p>}

            <div className="space-y-2">
              {!isCustomer && <button
                onClick={() => setShowThermalModal(true)}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all shadow-md shadow-orange-500/20 flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> Cetak Struk (Epson TM-T82X)
              </button>}
              <button
                onClick={() => setCompletedReceiptData(null)}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
              >
                {isCustomer ? 'Lanjut Belanja' : 'Transaksi Baru'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {showThermalModal && completedReceiptData && (
        <ThermalReceipt
          data={completedReceiptData}
          store={store}
          onClose={() => {
            setShowThermalModal(false);
            setCompletedReceiptData(null);
          }}
        />
      )}
    </div>
  );
}
