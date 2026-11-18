import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react';
import { api, type UserAccount } from '@/lib/api';

type ManagedRole = 'cashier' | 'customer';

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<ManagedRole>('cashier');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      setUsers(await api.users.getAll());
    } catch (err) {
      console.error('Error fetching user accounts:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat akun pengguna.');
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter(user => `${user.username} ${user.name} ${user.role}`.toLowerCase().includes(query));
  }, [users, search]);

  function openCreateForm() {
    setEditingUser(null);
    setUsername('');
    setName('');
    setPassword('');
    setRole('cashier');
    setIsActive(true);
    setError('');
    setShowForm(true);
  }

  function openEditForm(user: UserAccount) {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setPassword('');
    setRole(user.role === 'customer' ? 'customer' : 'cashier');
    setIsActive(Boolean(user.is_active));
    setError('');
    setShowForm(true);
  }

  async function saveUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, {
          username: username.trim(),
          name: name.trim(),
          ...(password ? { password } : {}),
          role,
          is_active: isActive,
        });
      } else {
        await api.users.create({ username: username.trim(), name: name.trim(), password, role });
      }
      setShowForm(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (err) {
      console.error('Error saving user account:', err);
      setError(err instanceof Error ? err.message : 'Gagal menyimpan akun pengguna.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: UserAccount) {
    if (!window.confirm(`Hapus akun ${user.username}?`)) return;
    setError('');
    try {
      await api.users.delete(user.id);
      await fetchUsers();
    } catch (err) {
      console.error('Error deleting user account:', err);
      setError(err instanceof Error ? err.message : 'Gagal menghapus akun pengguna.');
    }
  }

  return (
    <div className="space-y-4">
      {error && !showForm && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Akun Pengguna</h2>
          <p className="text-sm text-gray-500">Buat akun kasir dan pelanggan, atur akses, atau ubah password.</p>
        </div>
        <button onClick={openCreateForm} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600">
          <Plus className="h-4 w-4" /> Tambah Akun
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Cari nama, username, atau peran..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/70">
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Nama / Username</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Peran</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-500">Memuat akun...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Belum ada akun yang cocok.</td></tr>
              ) : filteredUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{user.name}</div>
                    <div className="font-mono text-xs text-gray-400">@{user.username}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      user.role === 'superadmin' ? 'bg-violet-50 text-violet-700' :
                        user.role === 'cashier' ? 'bg-orange-50 text-orange-700' : 'bg-sky-50 text-sky-700'
                    }`}>
                      {user.role === 'superadmin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                      {user.role === 'superadmin' ? 'Super Admin' : user.role === 'cashier' ? 'Kasir' : 'Pelanggan'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.is_active === true || user.is_active === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.is_active === true || user.is_active === 1 ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.role === 'superadmin' ? (
                      <span className="text-xs text-gray-400">Akun utama</span>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button aria-label={`Edit ${user.username}`} onClick={() => openEditForm(user)} className="rounded-lg p-2 text-gray-400 hover:bg-orange-50 hover:text-orange-600">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button aria-label={`Hapus ${user.username}`} onClick={() => void deleteUser(user)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{editingUser ? 'Edit Akun' : 'Buat Akun Baru'}</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100" aria-label="Tutup">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveUser} className="space-y-4">
              <div>
                <label htmlFor="account-name" className="mb-1.5 block text-sm font-medium text-gray-600">Nama lengkap *</label>
                <input id="account-name" required minLength={2} maxLength={100} value={name} onChange={event => setName(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label htmlFor="account-username" className="mb-1.5 block text-sm font-medium text-gray-600">Username *</label>
                <input id="account-username" required minLength={3} maxLength={32} pattern="[A-Za-z0-9._-]+" value={username} onChange={event => setUsername(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
                <p className="mt-1 text-xs text-gray-400">3–32 karakter: huruf, angka, titik, _ atau -</p>
              </div>
              <div>
                <label htmlFor="account-role" className="mb-1.5 block text-sm font-medium text-gray-600">Peran *</label>
                <select id="account-role" value={role} onChange={event => setRole(event.target.value as ManagedRole)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400">
                  <option value="cashier">Kasir — akses POS dan halaman operasional</option>
                  <option value="customer">Pelanggan — lihat produk dan buat pesanan</option>
                </select>
              </div>
              <div>
                <label htmlFor="account-password" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-600">
                  <KeyRound className="h-4 w-4" /> Password {editingUser ? '(kosongkan jika tidak diubah)' : '*'}
                </label>
                <input id="account-password" type="password" autoComplete="new-password" required={!editingUser} minLength={8} maxLength={128} value={password} onChange={event => setPassword(event.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
                <p className="mt-1 text-xs text-gray-400">8–128 karakter.</p>
              </div>
              {editingUser && (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isActive} onChange={event => setIsActive(event.target.checked)} className="h-4 w-4 accent-orange-500" />
                  Akun aktif
                </label>
              )}
              {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
              <button type="submit" disabled={saving} className="flex w-full items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
                {saving ? 'Menyimpan...' : editingUser ? 'Simpan Perubahan' : 'Buat Akun'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
