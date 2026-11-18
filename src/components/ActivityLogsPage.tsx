import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import CustomersPage from '@/components/CustomersPage';
import UsersManagementPage from '@/components/UsersManagementPage';

interface LogItem {
  id: number;
  activity: string;
  created_at: string;
}

interface CustomerChangeLog {
  id: number;
  id_pelanggan: number;
  nama_lama: string;
  nama_baru: string;
  created_at: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [custLogs, setCustLogs] = useState<CustomerChangeLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'system' | 'history' | 'accounts' | 'customers'>('accounts');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      api.logs.getAll(),
      api.logs.getCustomerChanges(),
    ]).then(([sys, cust]) => {
      if (sys) setLogs(sys);
      if (cust) setCustLogs(cust);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  const filteredLogs = logs.filter(l => l.activity.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Super Admin & Audit Log</h1>
          <p className="text-sm text-gray-500">Catatan log aktivitas & perubahan data otomatis dari trigger MySQL</p>
        </div>
        <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setTab('accounts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'accounts' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Akun Pengguna
          </button>
          <button
            onClick={() => setTab('customers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              tab === 'customers' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Data Pelanggan
          </button>
          <button onClick={() => setTab('system')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'system' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            Log Sistem
          </button>
          <button onClick={() => setTab('history')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'history' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            Riwayat Pelanggan
          </button>
        </div>
      </div>

      {tab === 'accounts' ? (
        <UsersManagementPage />
      ) : tab === 'customers' ? (
        <CustomersPage />
      ) : tab === 'system' ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
          <div className="mb-3">
            <input
              type="text"
              placeholder="Cari aktivitas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm border rounded-lg focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            {filteredLogs.map(l => (
              <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-gray-800 font-medium">{l.activity}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {new Date(l.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">ID Pelanggan</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama Lama</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Nama Baru</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Waktu Perubahan</th>
              </tr>
            </thead>
            <tbody>
              {custLogs.map(c => (
                <tr key={c.id} className="border-b border-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">#{c.id_pelanggan}</td>
                  <td className="px-4 py-3 text-red-600 font-medium">{c.nama_lama}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">{c.nama_baru}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
