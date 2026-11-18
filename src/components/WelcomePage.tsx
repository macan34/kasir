import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole, Package, ShieldCheck, ShoppingBag, ShoppingCart, Store } from 'lucide-react';
import { api, type AppRole, type AppUser } from '@/lib/api';

interface WelcomePageProps {
  onLogin: (role: AppRole, username: string, password: string) => Promise<AppUser>;
}

export default function WelcomePage({ onLogin }: WelcomePageProps) {
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.auth.getStatus()
      .then(status => setSetupRequired(status.setup_required))
      .catch(err => {
        console.error('Failed to check initial account setup:', err);
        setError(err instanceof Error ? err.message : 'Gagal memeriksa koneksi login.');
      });
  }, []);

  async function submitLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRole) return;
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onLogin(selectedRole, username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login gagal.');
    } finally {
      setSubmitting(false);
    }
  }

  const roleLabels: Record<AppRole, string> = {
    superadmin: 'Super Admin',
    cashier: 'Kasir',
    customer: 'Pelanggan',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">Retaillet POS</span>
        </div>
        <span className="hidden text-sm text-slate-400 sm:inline">Solusi kasir dan belanja yang praktis</span>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-12 px-6 py-12 lg:grid-cols-2">
        <section>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1.5 text-sm text-orange-300">
            <Store className="h-4 w-4" /> Toko dalam satu aplikasi
          </div>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight sm:text-6xl">
            Selamat datang di <span className="text-orange-400">Retaillet.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Kelola transaksi toko dengan mudah atau temukan produk pilihanmu dan buat pesanan langsung.
          </p>

          {setupRequired && (
            <div role="alert" className="mt-6 max-w-xl rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              Akun Super Admin belum dibuat. Atur <code>BOOTSTRAP_ADMIN_USERNAME</code> dan <code>BOOTSTRAP_ADMIN_PASSWORD</code> pada file <code>.env</code>, lalu jalankan ulang server.
            </div>
          )}

          {!selectedRole ? (
            <div className="mt-9 grid max-w-xl gap-4 sm:grid-cols-3">
              <button
                onClick={() => setSelectedRole('superadmin')}
                className="group rounded-2xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-orange-400/70 hover:bg-slate-800"
              >
                <ShieldCheck className="mb-4 h-6 w-6 text-orange-400" />
                <span className="block font-semibold">Super Admin</span>
                <span className="mt-1 block text-sm text-slate-400">Kelola akun dan data pelanggan</span>
                <ArrowRight className="mt-4 h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-orange-300" />
              </button>
              <button
                onClick={() => setSelectedRole('cashier')}
                className="group rounded-2xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-orange-400/70 hover:bg-slate-800"
              >
                <ShoppingCart className="mb-4 h-6 w-6 text-orange-400" />
                <span className="block font-semibold">Masuk sebagai kasir</span>
                <span className="mt-1 block text-sm text-slate-400">Buka POS dan kelola transaksi toko</span>
                <ArrowRight className="mt-4 h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-orange-300" />
              </button>
              <button
                onClick={() => setSelectedRole('customer')}
                className="group rounded-2xl border border-slate-700 bg-slate-900 p-5 text-left transition hover:border-orange-400/70 hover:bg-slate-800"
              >
                <Package className="mb-4 h-6 w-6 text-orange-400" />
                <span className="block font-semibold">Belanja sebagai pelanggan</span>
                <span className="mt-1 block text-sm text-slate-400">Lihat produk dan buat pesanan</span>
                <ArrowRight className="mt-4 h-4 w-4 text-slate-500 transition group-hover:translate-x-1 group-hover:text-orange-300" />
              </button>
            </div>
          ) : (
            <form onSubmit={submitLogin} className="mt-9 max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6">
              <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">Masuk sebagai {roleLabels[selectedRole]}</h2>
                <button type="button" onClick={() => { setSelectedRole(null); setError(''); }} className="text-sm text-slate-400 hover:text-white">
                  Kembali
                </button>
              </div>
              <label htmlFor="login-username" className="mb-2 block text-sm font-medium text-slate-300">Username</label>
              <input
              id="login-username"
                autoFocus
              autoComplete="username"
              value={username}
              onChange={event => { setUsername(event.target.value); setError(''); }}
              placeholder="Masukkan username"
                className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
              <label htmlFor="login-password" className="mb-2 mt-4 block text-sm font-medium text-slate-300">Password</label>
              <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={event => { setPassword(event.target.value); setError(''); }}
              placeholder="Masukkan password"
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
              {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}
              <button type="submit" disabled={submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 font-semibold transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? 'Memeriksa...' : 'Masuk'} <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          )}
        </section>

        <aside className="relative hidden min-h-[460px] items-center justify-center lg:flex">
          <div className="absolute h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
          <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Retaillet</p>
                <p className="mt-1 text-xl font-bold">Belanja dan transaksi</p>
              </div>
              <div className="rounded-2xl bg-orange-500 p-3"><ShoppingBag className="h-6 w-6" /></div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-4 rounded-2xl bg-slate-900/80 p-4">
                <div className="rounded-xl bg-emerald-400/10 p-3 text-emerald-300"><ShoppingCart className="h-5 w-5" /></div>
                <div><p className="font-semibold">Kasir siap melayani</p><p className="text-sm text-slate-400">Transaksi dan inventaris terhubung</p></div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl bg-slate-900/80 p-4">
                <div className="rounded-xl bg-orange-400/10 p-3 text-orange-300"><Package className="h-5 w-5" /></div>
                <div><p className="font-semibold">Produk mudah ditemukan</p><p className="text-sm text-slate-400">Pilih barang, masukkan keranjang, pesan</p></div>
              </div>
              <div className="flex items-center gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400">
                <LockKeyhole className="h-4 w-4 shrink-0 text-orange-300" />
                Login memakai akun terdaftar dengan password yang di-hash aman.
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
