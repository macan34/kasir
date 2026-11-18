export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

export const navSections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
      { id: 'pos', label: 'Kasir POS', icon: 'ShoppingCart' },
      { id: 'orders', label: 'Persetujuan Pesanan', icon: 'ClipboardCheck' },
      { id: 'transactions', label: 'Riwayat Transaksi', icon: 'Receipt' },
      { id: 'customers', label: 'Pelanggan', icon: 'Users' },
      { id: 'super-admin', label: 'Super Admin & Logs', icon: 'ShieldCheck' },
    ],
  },
  {
    title: 'Inventory',
    items: [
      { id: 'products', label: 'Products', icon: 'Package' },
      { id: 'create-product', label: 'Create Product', icon: 'PlusSquare' },
      { id: 'low-stocks', label: 'Low Stocks', icon: 'AlertTriangle', badge: 'Alert', badgeColor: 'bg-amber-500' },
      { id: 'category', label: 'Category', icon: 'FolderTree' },
      { id: 'sub-category', label: 'Sub Category', icon: 'Folders' },
      { id: 'brands', label: 'Brands & Units', icon: 'Tag' },
      { id: 'print-barcode', label: 'Print Barcode', icon: 'Barcode' },
      { id: 'print-qr', label: 'Print QR Code', icon: 'QrCode' },
    ],
  },
  {
    title: 'Stock',
    items: [
      { id: 'manage-stock', label: 'Manage Stock', icon: 'Boxes' },
      { id: 'stock-adjustment', label: 'Stock Adjustment', icon: 'SlidersHorizontal' },
      { id: 'stock-transfer', label: 'Stock Transfer', icon: 'ArrowLeftRight' },
    ],
  },
];
