import { useState, useEffect, useMemo } from 'react';
import {
  Search, Plus, Pencil, Trash2, X, AlertTriangle, Package, Printer,
  Loader2, Filter, ArrowUpDown
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Product, Category, Store, ProductInput } from '@/types';

interface ProductsPageProps {
  store: Store | null;
  onNavigate: (page: string) => void;
}

type SortField = 'name' | 'price' | 'stock_quantity';

export default function ProductsPage({ store, onNavigate }: ProductsPageProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string | number>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        api.products.getAll(),
        api.categories.getAll(),
      ]);
      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      const query = search.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.barcode && p.barcode.toLowerCase().includes(query));
      const matchesCategory = filterCategory === 'all' || String(p.category_id) === String(filterCategory);
      return matchesSearch && matchesCategory;
    });
    result = result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'price') cmp = a.price - b.price;
      else cmp = a.stock_quantity - b.stock_quantity;
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [products, search, filterCategory, sortField, sortAsc]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  }

  async function handleDelete() {
    if (!deleteProduct) return;
    try {
      await api.products.delete(deleteProduct.id);
      setDeleteProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  }

  async function handleSave(input: ProductInput, id?: number | string) {
    if (id) {
      await api.products.update(id, input);
    } else {
      await api.products.create(input);
    }
    setShowForm(false);
    setEditProduct(null);
    await fetchProducts();
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
          <h1 className="text-xl font-bold text-gray-800">Products</h1>
          <p className="text-sm text-gray-500">{filtered.length} items in inventory (Local MySQL)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onNavigate('print-barcode')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" /> Cetak Label
          </button>
          <button
            onClick={() => { setEditProduct(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="pl-10 pr-8 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">
                  <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-800">
                    Product <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Category</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">
                  <button onClick={() => toggleSort('price')} className="flex items-center gap-1 hover:text-gray-800 ml-auto">
                    Price <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">
                  <button onClick={() => toggleSort('stock_quantity')} className="flex items-center gap-1 hover:text-gray-800 ml-auto">
                    Stock <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2" />
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const outOfStock = product.stock_quantity <= 0;
                  const lowStock = product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0;
                  return (
                    <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center shrink-0">
                            {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover rounded-lg" /> : <Package className="w-4 h-4 text-gray-300" />}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-800 truncate">{product.name}</div>
                            <div className="text-xs text-gray-400 md:hidden">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {product.categories && <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">{product.categories.name}</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">Rp {product.price.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${outOfStock ? 'bg-red-50 text-red-600' : lowStock ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {(outOfStock || lowStock) && <AlertTriangle className="w-3 h-3" />}
                          {product.stock_quantity} {product.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setEditProduct(product); setShowForm(true); }} className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteProduct(product)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product form modal */}
      {showForm && (
        <ProductFormModal
          product={editProduct}
          categories={categories}
          storeId={store?.id ?? null}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          onSave={handleSave}
        />
      )}

      {/* Delete confirmation */}
      {deleteProduct && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteProduct(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Delete Product?</h3>
            <p className="text-sm text-gray-500 text-center mb-5">Are you sure you want to delete <span className="font-semibold text-gray-700">{deleteProduct.name}</span>? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteProduct(null)} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProductFormModalProps {
  product: Product | null;
  categories: Category[];
  storeId: number | string | null;
  onClose: () => void;
  onSave: (input: ProductInput, id?: number | string) => void;
}

function ProductFormModal({ product, categories, storeId, onClose, onSave }: ProductFormModalProps) {
  const [form, setForm] = useState<ProductInput>({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    barcode: product?.barcode ?? '',
    category_id: product?.category_id ?? (categories[0]?.id ?? null),
    store_id: product?.store_id ?? storeId,
    price: product?.price ?? 0,
    cost: product?.cost ?? 0,
    stock_quantity: product?.stock_quantity ?? 0,
    low_stock_threshold: product?.low_stock_threshold ?? 5,
    unit: product?.unit ?? 'Pcs',
    image_url: product?.image_url ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      setError('Name and SKU are required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form, product?.id);
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
      setSaving(false);
    }
  }

  const units = ['Pcs', 'Kg', 'Box', 'Pack', 'Liter', 'Dozen'];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">{product ? 'Edit Product' : 'Add New Product'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
              placeholder="e.g. Apple iPhone 15"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">SKU *</label>
              <input
                type="text"
                value={form.sku}
                onChange={e => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-mono"
                placeholder="ELC-001"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Barcode (scan produk)</label>
              <input
                type="text"
                value={form.barcode ?? ''}
                onChange={e => setForm({ ...form, barcode: e.target.value })}
                onKeyDown={e => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
                autoComplete="off"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all font-mono"
                placeholder="Scan barcode produk"
              />
              <p className="mt-1 text-[11px] text-gray-500">Fokuskan kolom ini lalu scan barcode. Kode tersimpan sebagai barcode produk.</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600 mb-1.5 block">Category</label>
            <select
              value={form.category_id ?? ''}
              onChange={e => setForm({ ...form, category_id: e.target.value || null })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all cursor-pointer"
            >
              <option value="">Uncategorized</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Selling Price (Rp)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.price}
                onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Cost Price (Rp)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.cost}
                onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Stock Qty</label>
              <input
                type="number"
                min="0"
                value={form.stock_quantity}
                onChange={e => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Low Stock Alert</label>
              <input
                type="number"
                min="0"
                value={form.low_stock_threshold}
                onChange={e => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 mb-1.5 block">Unit</label>
              <select
                value={form.unit}
                onChange={e => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all cursor-pointer"
              >
                {units.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {product ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
