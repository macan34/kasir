export type TrendDirection = 'up' | 'down';

export interface KPICard {
  id: string;
  label: string;
  value: string;
  trend: number;
  trendDirection: TrendDirection;
  icon: string;
  accent: string;
  bgAccent: string;
  iconBg: string;
}

export const primaryKPIs: KPICard[] = [
  {
    id: 'total-sales',
    label: 'Total Sales',
    value: 'Rp 84.254.000',
    trend: 22,
    trendDirection: 'up',
    icon: 'ShoppingCart',
    accent: 'border-l-orange-500',
    bgAccent: 'bg-orange-50',
    iconBg: 'bg-orange-500',
  },
  {
    id: 'sales-return',
    label: 'Total Sales Return',
    value: 'Rp 12.254.000',
    trend: 12,
    trendDirection: 'down',
    icon: 'Undo2',
    accent: 'border-l-slate-800',
    bgAccent: 'bg-slate-50',
    iconBg: 'bg-slate-800',
  },
  {
    id: 'total-purchase',
    label: 'Total Purchase',
    value: 'Rp 74.569.000',
    trend: 18,
    trendDirection: 'up',
    icon: 'PackageCheck',
    accent: 'border-l-teal-500',
    bgAccent: 'bg-teal-50',
    iconBg: 'bg-teal-500',
  },
  {
    id: 'purchase-return',
    label: 'Total Purchase Return',
    value: 'Rp 8.142.000',
    trend: 6,
    trendDirection: 'down',
    icon: 'PackageMinus',
    accent: 'border-l-blue-500',
    bgAccent: 'bg-blue-50',
    iconBg: 'bg-blue-500',
  },
];

export interface SecondaryMetric {
  id: string;
  label: string;
  value: string;
  comparison: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

export const secondaryMetrics: SecondaryMetric[] = [
  {
    id: 'profit',
    label: 'Profit',
    value: 'Rp 45.215.000',
    comparison: 'vs bulan lalu',
    icon: 'TrendingUp',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
  },
  {
    id: 'invoice-due',
    label: 'Invoice Due',
    value: 'Rp 14.230.000',
    comparison: 'vs bulan lalu',
    icon: 'FileText',
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100',
  },
  {
    id: 'expenses',
    label: 'Total Expenses',
    value: 'Rp 22.580.000',
    comparison: 'vs bulan lalu',
    icon: 'Wallet',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
  },
  {
    id: 'payment-returns',
    label: 'Total Payment Returns',
    value: 'Rp 5.120.000',
    comparison: 'vs bulan lalu',
    icon: 'CreditCard',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-100',
  },
];

export interface ChartDataPoint {
  month: string;
  purchase: number;
  sales: number;
}

export const monthlyChartData: ChartDataPoint[] = [
  { month: 'Jan', purchase: 32000, sales: 28000 },
  { month: 'Feb', purchase: 38000, sales: 35000 },
  { month: 'Mar', purchase: 45000, sales: 52000 },
  { month: 'Apr', purchase: 41000, sales: 48000 },
  { month: 'May', purchase: 55000, sales: 61000 },
  { month: 'Jun', purchase: 49000, sales: 55000 },
  { month: 'Jul', purchase: 62000, sales: 70000 },
  { month: 'Aug', purchase: 58000, sales: 66000 },
  { month: 'Sep', purchase: 67000, sales: 72000 },
  { month: 'Oct', purchase: 71000, sales: 78000 },
  { month: 'Nov', purchase: 68000, sales: 84000 },
  { month: 'Dec', purchase: 74000, sales: 84254 },
];

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
