import { useState } from 'react';
import {
  LayoutDashboard, ShieldCheck, Package, PlusSquare, CalendarX, AlertTriangle,
  FolderTree, Folders, Tag, Ruler, Layers, Shield, Barcode, QrCode,
  Boxes, SlidersHorizontal, ArrowLeftRight, ChevronLeft, ChevronRight,
  ChevronDown, ShoppingBag, ShoppingCart, Receipt, Users, type LucideIcon
} from 'lucide-react';
import { navSections } from '@/data/mockData';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, ShieldCheck, Package, PlusSquare, CalendarX, AlertTriangle,
  FolderTree, Folders, Tag, Ruler, Layers, Shield, Barcode, QrCode,
  Boxes, SlidersHorizontal, ArrowLeftRight, ShoppingCart, Receipt, Users,
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeItem: string;
  onSelect: (id: string) => void;
}

export default function Sidebar({ collapsed, onToggle, activeItem, onSelect }: SidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    Main: true,
    Inventory: true,
    Stock: true,
  });

  const toggleSection = (title: string) => {
    if (collapsed) return;
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 h-16 px-4 border-b border-gray-200">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-orange-500 shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-gray-800 tracking-tight">Retaillet POS</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="overflow-y-auto h-[calc(100vh-8rem)] py-4 scrollbar-thin">
        {navSections.map((section) => (
          <div key={section.title} className="mb-1">
            {!collapsed && (
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600"
              >
                {section.title}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openSections[section.title] ? '' : '-rotate-90'}`} />
              </button>
            )}
            {collapsed && (
              <div className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-300 text-center">•</div>
            )}
            {(openSections[section.title] || collapsed) && (
              <div className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const Icon = iconMap[item.icon] || Package;
                  const isActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelect(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all group relative ${
                        isActive
                          ? 'bg-orange-50 text-orange-600'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-orange-500 rounded-r" />}
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-gray-600'}`} />
                      {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                      {!collapsed && item.badge && (
                        <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full ${item.badgeColor || 'bg-gray-400'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="absolute bottom-0 left-0 right-0 h-16 border-t border-gray-200 flex items-center justify-center">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /> Sembunyikan</>}
        </button>
      </div>
    </aside>
  );
}
