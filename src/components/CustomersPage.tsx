import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Search, Loader2, BadgePercent, ShieldCheck } from 'lucide-react';
import { api, type CustomerRecord } from '@/lib/api';

type Customer = CustomerRecord;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [memberRef, setMemberRef] = useState('');
  const [memberDiscount, setMemberDiscount] = useState(0);
  const [isMember, setIsMember] = useState(false);
  const [defaultMemberDiscount, setDefaultMemberDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const [data, settings] = await Promise.all([
        api.customers.getAll(),
        api.customers.getMemberSettings(),
      ]);
      setCustomers(data || []);
      setDefaultMemberDiscount(settings.default_member_discount);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat data pelanggan/member.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = customers.filter(c => {
    const haystack = `${c.name} ${c.city || ''} ${c.member_ref || ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const normalizedRef = memberRef.trim();
      const normalizedDiscount = Math.max(0, Math.min(100, Number(memberDiscount) || 0));
      const payload = {
        name: name.trim(),
        city: city.trim() || undefined,
        member_ref: normalizedRef || null,
        member_discount: normalizedDiscount,
        is_member: isMember,
      };

      if (editCustomer) {
        await api.customers.update(editCustomer.id, payload);
      } else {
        await api.customers.create(payload);
      }

      setShowModal(false);
      setEditCustomer(null);
      setName('');
      setCity('');
      setMemberRef('');
      setMemberDiscount(0);
      setIsMember(false);
      await fetchCustomers();
    } catch (err) {
      console.error('Error saving customer:', err);
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data pelanggan/member.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number | string) {
    if (!confirm('Hapus data pelanggan ini?')) return;
    try {
      await api.customers.delete(id);
      await fetchCustomers();
    } catch (err) {
      console.error('Error deleting customer:', err);
      setError(err instanceof Error ? err.message : 'Gagal menghapus pelanggan.');
    }
  }

  function openCreateModal() {
    setEditCustomer(null);
    setName('');
    setCity('');
    setMemberRef('');
    setMemberDiscount(0);
    setIsMember(false);
    setError('');
    setShowModal(true);
  }

  function openEditModal(customer: Customer) {
    setEditCustomer(customer);
    setName(customer.name);
    setCity(customer.city || '');
    setMemberRef(customer.member_ref || '');
    setMemberDiscount(Number(customer.member_discount || 0));
    setIsMember(Boolean(customer.is_member));
    setError('');
    setShowModal(true);
  }

  async function saveMemberSettings() {
    setSettingsSaving(true);
    setError('');
    try {
      const result = await api.customers.updateMemberSettings(defaultMemberDiscount);
      setDefaultMemberDiscount(result.default_member_discount);
    } catch (err) {
      console.error('Error saving member settings:', err);
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan diskon member.');
    } finally {
      setSettingsSaving(false);
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
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Data Pelanggan & Kartu Member</h1>
          <p className="text-sm text-gray-500">{customers.length} pelanggan terdaftar di database lokal</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20"
        >
          <Plus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <div className="flex-1">
            <label className="text-xs uppercase tracking-wide text-gray-500 block mb-1">Diskon Member Default (Admin)</label>
            <div className="flex items-center gap-2">
              <BadgePercent className="w-4 h-4 text-orange-500" />
              <input
                type="number"
                min={0}
                max={100}
                value={defaultMemberDiscount}
                onChange={e => setDefaultMemberDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              />
              <span className="text-xs text-gray-500">%</span>
            </div>
          </div>
          <button
            type="button"
            onClick={saveMemberSettings}
            disabled={settingsSaving}
            className="px-4 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60"
          >
            {settingsSaving ? 'Menyimpan...' : 'Simpan Setting'}
          </button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, kota atau REF member..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama Pelanggan</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Kota / Alamat</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Member</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">#{c.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.city || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.is_member === true || c.is_member === 1 ? (
                      <div className="inline-flex flex-col gap-0.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-emerald-700">
                        <span className="font-semibold text-[11px] uppercase tracking-wide">Member</span>
                        <span className="text-xs font-medium">REF: {c.member_ref || '—'}</span>
                        <span className="text-[11px]">Diskon: {c.member_discount || 0}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Non Member</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(c)}
                        className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{editCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Misal: Budi Santoso"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Kota / Domisili</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Misal: Ponorogo, Madiun, Surabaya"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
                />
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  Kartu Member
                </div>
                {error && <div role="alert" className="text-xs text-red-700">{error}</div>}

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isMember} onChange={e => setIsMember(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                  Aktifkan member
                </label>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Scan / Kode kartu member</label>
                  <input
                    type="text"
                    value={memberRef}
                    onChange={e => setMemberRef(e.target.value.trim())}
                    onKeyDown={e => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    placeholder="Tap kartu / scan kode dengan reader"
                    autoComplete="off"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Tap kartu dengan reader saat kolom ini aktif. Kode kartu akan tersimpan di database.</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Diskon Member (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={memberDiscount}
                    onChange={e => setMemberDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    placeholder="10"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  />
                </div>
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
