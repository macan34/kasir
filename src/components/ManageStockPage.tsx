import React, { useState, useEffect } from 'react';
import { Boxes, ArrowUpDown, Plus, Minus, SlidersHorizontal, Search, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface StockItem {
  id: number | string;
  name: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  unit: string;
  price: number;
  category_name?: string;
  store_name?: string;
}

export default function ManageStockPage() {
  const [stockList, setStockList] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<StockItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract' | 'set'>('add');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchStock();
  }, []);

  async function fetchStock() {
    setLoading(true);
    try {
      const data = await api.stock.getAll();
      if (data) setStockList(data);
    } catch (err) {
      console.error('Error fetching stock:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = stockList.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.sku.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAdjustSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct || typeof quantity !== 'number' || quantity < 0) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.stock.adjust({
        product_id: selectedProduct.id,
        adjustment_type: adjustType,
        quantity,
        notes: notes || undefined,
      });
      setMessage(`Stok produk "${selectedProduct.name}" berhasil disesuaikan!`);
      setSelectedProduct(null);
      setQuantity('');
      setNotes('');
      await fetchStock();
    } catch (err: any) {
      console.error('Error adjusting stock:', err);
      alert('Gagal menyesuaikan stok: ' + err.message);
    } finally {
      setSaving(false);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Manajemen & Penyesuaian Stok</h1>
          <p className="text-sm text-gray-500">Pantau dan sesuaikan jumlah fisik stok barang secara real-time</p>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-xl flex items-center gap-2 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5" />
          {message}
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari berdasarkan nama atau SKU..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
        />
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Produk</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Kategori</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Sisa Stok</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Penyesuaian</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isOut = p.stock_quantity <= 0;
                const isLow = p.stock_quantity <= p.low_stock_threshold && !isOut;
                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 hidden md:table-cell">{p.sku}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.category_name || 'Umum'}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800">
                      {p.stock_quantity} {p.unit}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isOut ? 'bg-red-50 text-red-600' : isLow ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {(isOut || isLow) && <AlertTriangle className="w-3 h-3" />}
                        {isOut ? 'Habis' : isLow ? 'Stok Tipis' : 'Aman'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setQuantity('');
                          setAdjustType('add');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold rounded-lg transition-colors border border-orange-200"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" /> Sesuaikan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Penyesuaian Stok */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Penyesuaian Stok</h3>
            <p className="text-xs text-gray-500 mb-4">{selectedProduct.name} ({selectedProduct.sku})</p>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-xl flex justify-between items-center text-sm">
                <span className="text-gray-600">Stok Saat Ini:</span>
                <span className="font-bold text-gray-800 text-base">{selectedProduct.stock_quantity} {selectedProduct.unit}</span>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Jenis Aksi</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1 ${
                      adjustType === 'add' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('subtract')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1 ${
                      adjustType === 'subtract' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" /> Kurang Rusak
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('set')}
                    className={`py-2 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1 ${
                      adjustType === 'set' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'
                    }`}
                  >
                    Set Fisik
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Jumlah {selectedProduct.unit} *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={quantity}
                  onChange={e => setQuantity(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Catatan / Alasan (Opsional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Misal: Stok opname bulanan, barang retur"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSelectedProduct(null)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
