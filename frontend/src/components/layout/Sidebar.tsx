import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore } from '../../store/useBillingStore';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Package,
  CreditCard,
  BookOpen,
  FolderKanban,
  FileText,
  ShieldCheck,
  Layout,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { AccuraLogo } from '../ui/AccuraLogo';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenOrgSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenOrgSettings,
}) => {
  const { user, activeOrganization, activeRole, logout } = useAuth();
  const { activeTab, setActiveTab, setWhatsAppDrawerOpen } = useBillingStore();

  const erpNavGroups = [
    {
      group: 'WORK',
      items: [
        { key: 'overview', label: 'Command Center', icon: LayoutDashboard },
        { key: 'billing', label: 'Billing & Invoices', icon: FileSpreadsheet },
        { key: 'documents', label: 'Document Registry', icon: FolderKanban },
      ],
    },
    {
      group: 'RELATIONSHIPS',
      items: [
        { key: 'customers', label: 'Customers', icon: Users },
        { key: 'products', label: 'Products & Rates', icon: Package },
      ],
    },
    {
      group: 'FINANCE',
      items: [
        { key: 'payments', label: 'Payments & FIFO', icon: CreditCard },
        { key: 'ledger', label: 'Customer Ledger', icon: BookOpen },
        { key: 'reports', label: 'Tax & Reports', icon: FileText },
      ],
    },
    {
      group: 'STOCK',
      items: [
        { key: 'inventory', label: 'Physical Inventory', icon: Package },
      ],
    },
    {
      group: 'DESIGN',
      items: [
        { key: 'templates', label: 'Template Studio', icon: Layout },
      ],
    },
    ...(activeRole === 'admin' || activeRole === 'auditor'
      ? [
          {
            group: 'AUDIT',
            items: [
              { key: 'audit', label: 'Audit Trail', icon: ShieldCheck },
            ],
          },
        ]
      : []),
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#FAF9F5]/95 backdrop-blur-xl text-stone-700 select-none border-r border-stone-900/[0.06] text-xs shadow-xs">
      {/* Brand Header */}
      <div className="p-4 border-b border-stone-900/[0.05] flex items-center justify-between">
        <div className="flex items-center space-x-3 overflow-hidden">
          {isCollapsed ? (
            <AccuraLogo variant="symbol" size="md" />
          ) : (
            <AccuraLogo variant="full" size="md" showSubtitle={true} subtitleText="Financial Ops" />
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        {/* Mobile Close Toggle */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-lg hover:bg-stone-200/60 text-stone-400 hover:text-stone-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Grouped Business Navigation */}
      <div className="flex-1 py-4 px-2.5 space-y-4 overflow-y-auto custom-scrollbar">
        {erpNavGroups.map((grp) => (
          <div key={grp.group} className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 pb-1 text-[9px] font-extrabold uppercase text-stone-400 tracking-widest">
                {grp.group}
              </div>
            )}

            {grp.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setActiveTab(item.key as any);
                    onCloseMobile();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center px-3 py-2 rounded-xl font-bold transition-all duration-150 cursor-pointer group text-left ${
                    isActive
                      ? 'bg-white text-stone-950 shadow-xs border border-stone-900/[0.08] translate-x-0.5'
                      : 'text-stone-600 hover:bg-stone-900/[0.04] hover:text-stone-900'
                  } ${isCollapsed ? 'justify-center' : 'space-x-2.5'}`}
                >
                  <div className="relative shrink-0">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-stone-950' : 'text-stone-400 group-hover:text-stone-700'
                      }`}
                    />
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4F442] absolute -top-0.5 -right-0.5" />
                    )}
                  </div>

                  {!isCollapsed && <span className="truncate text-xs">{item.label}</span>}
                </button>
              );
            })}
          </div>
        ))}

        {/* Intelligence Quick Tools */}
        <div className="space-y-1 pt-3 border-t border-stone-900/[0.05]">
          {!isCollapsed && (
            <div className="px-3 pb-1 text-[9px] font-extrabold uppercase text-stone-400 tracking-widest flex items-center space-x-1">
              <Sparkles className="w-2.5 h-2.5 text-stone-400" />
              <span>INTELLIGENCE</span>
            </div>
          )}

          <button
            onClick={() => {
              setWhatsAppDrawerOpen(true);
              onCloseMobile();
            }}
            title={isCollapsed ? 'WhatsApp Parser' : undefined}
            className={`w-full flex items-center px-3 py-2 rounded-xl font-bold text-stone-800 bg-[#D4F442]/15 hover:bg-[#D4F442]/30 border border-[#D4F442]/30 transition-all cursor-pointer ${
              isCollapsed ? 'justify-center' : 'space-x-2.5'
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-stone-900" />
            {!isCollapsed && <span className="text-xs truncate">WhatsApp Parser</span>}
          </button>
        </div>
      </div>

      {/* Administration & Organization Footer Section */}
      <div className="p-3 border-t border-stone-900/[0.05] space-y-2 bg-stone-900/[0.02]">
        <button
          onClick={() => {
            onOpenOrgSettings();
            onCloseMobile();
          }}
          title={isCollapsed ? 'Organization Settings' : undefined}
          className={`w-full flex items-center p-2 rounded-xl hover:bg-white text-xs font-bold text-stone-700 transition-all cursor-pointer ${
            isCollapsed ? 'justify-center' : 'space-x-2.5'
          }`}
        >
          <Settings className="w-4 h-4 text-stone-500 shrink-0" />
          {!isCollapsed && (
            <div className="text-left truncate flex-1">
              <div className="font-extrabold text-stone-900 text-xs truncate">
                {activeOrganization?.name || 'Organization'}
              </div>
              <div className="text-[10px] text-stone-400 font-medium truncate">Settings & Profile</div>
            </div>
          )}
        </button>

        {/* User Profile & Logout */}
        <div className={`pt-2 border-t border-stone-900/[0.05] flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-1`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-2 truncate">
              <div className="w-7 h-7 rounded-full bg-stone-900 text-[#D4F442] font-extrabold text-[11px] flex items-center justify-center shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="text-xs font-extrabold text-stone-900 truncate">{user?.name}</div>
                <div className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">{activeRole}</div>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed left-0 top-0 bottom-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (Overlay) */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex">
          <div className="w-64 max-w-[80vw] h-full shadow-2xl animate-slide-in-right">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
