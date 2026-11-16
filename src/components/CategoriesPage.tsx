import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Category } from '@/types';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const data = await api.categories.getAll();
      if (data) setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editCategory) {
        await api.categories.update(editCategory.id, { name });
      } else {
        await api.categories.create({ name });
      }
      setShowModal(false);
      setEditCategory(null);
      setName('');
      await fetchCategories();
    } catch (err) {
      console.error('Error saving category:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number | string) {
    if (!confirm('Apakah Anda yakin ingin menghapus kategori ini?')) return;
    try {
      await api.categories.delete(id);
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
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
          <h1 className="text-xl font-bold text-gray-800">Kategori Produk</h1>
          <p className="text-sm text-gray-500">{categories.length} kategori terdaftar di database lokal (tbl_kategori)</p>
        </div>
        <button
          onClick={() => {
            setEditCategory(null);
            setName('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Tambah Kategori
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map((cat, idx) => (
          <div key={cat.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 font-bold shrink-0">
                <FolderTree className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-gray-800 truncate">{cat.name}</div>
                <div className="text-xs text-gray-400">ID #{cat.id}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setEditCategory(cat);
                  setName(cat.name);
                  setShowModal(true);
                }}
                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(cat.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editCategory ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nama Kategori *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Misal: Sembako & Minuman"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">Batal</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl text-sm transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
