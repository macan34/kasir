import { useState, useRef, useEffect } from 'react';
import {
  Search, Plus, ShoppingCart, Maximize2, Minimize2,
  ChevronDown, Store, FilePlus, PackagePlus,
  UserPlus, FileText, LogOut, Menu
} from 'lucide-react';
import type { Store as StoreType } from '@/types';
import type { AppRole } from '@/lib/api';

interface HeaderProps {
  onMenuToggle: () => void;
  stores: StoreType[];
  selectedStore: StoreType | null;
  onStoreChange: (store: StoreType) => void;
  onNavigate: (page: string) => void;
  userName: string;
  userRole: AppRole;
  onLogout: () => void;
}

export default function Header({ onMenuToggle, stores, selectedStore, onStoreChange, onNavigate, userName, userRole, onLogout }: HeaderProps) {
  const [storeOpen, setStoreOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const storeRef = useRef<HTMLDivElement>(null);
  const addRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (storeRef.current && !storeRef.current.contains(e.target as Node)) setStoreOpen(false);
      if (addRef.current && !addRef.current.contains(e.target as Node)) setAddOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const addMenuItems = [
    { icon: PackagePlus, label: 'Produk Baru', page: 'create-product' },
    { icon: FileText, label: 'Transaksi Baru (POS)', page: 'pos' },
    { icon: UserPlus, label: 'Pelanggan Baru', page: 'customers' },
    { icon: FilePlus, label: 'Riwayat Transaksi', page: 'transactions' },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 gap-4">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <Menu className="w-5 h-5" />
        </button>

        {userRole !== 'cashier' && <div className="relative max-w-md flex-1 hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari transaksi, produk, pelanggan..."
            className="w-full pl-10 pr-12 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded px-1.5 py-0.5">⌘K</kbd>
        </div>}

        {/* Store selector */}
        <div ref={storeRef} className="relative">

          {storeOpen && (
            <div className="absolute top-full mt-2 left-0 w-60 bg-white border border-gray-200 rounded-xl shadow-xl py-2 animate-fadeIn z-50">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                Cabang Toko Aktif (tbl_cabang)
              </div>
              {stores.map(s => (
                <button
                  key={s.id}
                  onClick={() => { onStoreChange(s); setStoreOpen(false); }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm text-left hover:bg-gray-50 ${s.id === selectedStore?.id ? 'text-orange-600 font-semibold bg-orange-50/50' : 'text-gray-700'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Store className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-normal ml-2">{s.address}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Add New */}
        {userRole === 'superadmin' && (
        <div ref={addRef} className="relative">
          <button
            onClick={() => setAddOpen(!addOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors shadow-sm shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Tambah Baru</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>
          {addOpen && (
            <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-2 animate-fadeIn z-50">
              {addMenuItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => { onNavigate(item.page); setAddOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left"
                >
                  <item.icon className="w-4 h-4 text-gray-400" />
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* POS Button */}
        <button
          onClick={() => onNavigate('pos')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Kasir POS</span>
        </button>

        {/* Fullscreen */}
        <button onClick={toggleFullscreen} className="p-2 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 pr-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-sm font-semibold text-gray-800 leading-tight">{userName}</div>
              <div className="text-xs text-emerald-600 font-medium">
                {userRole === 'superadmin' ? 'Super Admin' : 'Kasir'}
              </div>
            </div>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
              <button
                onClick={() => { setProfileOpen(false); onLogout(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 text-gray-400" /> Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
