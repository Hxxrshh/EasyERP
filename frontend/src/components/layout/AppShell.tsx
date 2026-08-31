import React, { useState } from 'react';
import { useQueryClient, useIsFetching } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore } from '../../store/useBillingStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Sidebar } from './Sidebar';
import { CommandPalette } from '../common/CommandPalette';
import { KeyboardHelpModal } from '../common/KeyboardHelpModal';
import { TemplateSettingsModal } from '../common/TemplateSettingsModal';
import { OrganizationSettingsModal } from '../common/OrganizationSettingsModal';
import { CreateClientModal } from '../clients/CreateClientModal';
import { CreateProductModal } from '../products/CreateProductModal';
import { Mascot } from '../mascot/Mascot';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  Search,
  RefreshCw,
  Keyboard,
  ShieldAlert,
  Menu,
  ChevronRight,
  Settings,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, activeOrganization, activeRole, setActiveOrganizationId } = useAuth();
  const { activeTab, setActiveTab, setSelectedClientId } = useBillingStore();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();

  // Sidebar Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Modals State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);
  const [isTemplateSettingsOpen, setIsTemplateSettingsOpen] = useState(false);
  const [isOrgSettingsOpen, setIsOrgSettingsOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const handleRefreshAll = () => {
    queryClient.invalidateQueries();
  };

  useKeyboardShortcuts({
    onToggleCommandPalette: () => setIsCommandPaletteOpen(true),
    onNewBill: () => setActiveTab('billing'),
    onNewClient: () => setIsClientModalOpen(true),
    onNewProduct: () => setIsProductModalOpen(true),
    onRecordPayment: () => setActiveTab('payments'),
    onRefresh: handleRefreshAll,
    onEscape: () => {
      setIsCommandPaletteOpen(false);
      setIsKeyboardHelpOpen(false);
      setIsTemplateSettingsOpen(false);
      setIsOrgSettingsOpen(false);
      setIsClientModalOpen(false);
      setIsProductModalOpen(false);
    },
  });

  const getPageContext = () => {
    switch (activeTab) {
      case 'overview':
        return { eyebrow: 'OPERATIONS', title: 'Command Center' };
      case 'billing':
        return { eyebrow: 'DOCUMENTS', title: 'Billing & Invoice Editor' };
      case 'documents':
        return { eyebrow: 'REGISTRY', title: 'Document Lifecycle Registry' };
      case 'customers':
        return { eyebrow: 'RELATIONSHIPS', title: 'Customers & Accounts' };
      case 'products':
        return { eyebrow: 'CATALOG', title: 'Products & Price Intelligence' };
      case 'payments':
        return { eyebrow: 'FINANCE', title: 'Payments & FIFO Allocation' };
      case 'ledger':
        return { eyebrow: 'ACCOUNTING', title: 'Customer Ledger Statements' };
      case 'inventory':
        return { eyebrow: 'STOCK', title: 'Physical Inventory Movements' };
      case 'reports':
        return { eyebrow: 'ANALYTICS', title: 'Tax Returns & Financial Reports' };
      case 'templates':
        return { eyebrow: 'DESIGN STUDIO', title: 'Document Template Warehouse' };
      case 'audit':
        return { eyebrow: 'CONTROL & SECURITY', title: 'Forensic Audit Trail' };
      default:
        return { eyebrow: 'WORKSPACE', title: 'Workspace' };
    }
  };

  const contextInfo = getPageContext();

  return (
    <div className="min-h-screen bg-paper-mesh flex font-sans antialiased text-stone-900">
      {/* Global Modals */}
      <CreateClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={(id) => {
          setSelectedClientId(id);
          setActiveTab('customers');
        }}
      />
      <CreateProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenKeyboardHelp={() => {
          setIsCommandPaletteOpen(false);
          setIsKeyboardHelpOpen(true);
        }}
        onOpenNewClient={() => setIsClientModalOpen(true)}
        onOpenNewProduct={() => setIsProductModalOpen(true)}
        onOpenOrgSettings={() => setIsOrgSettingsOpen(true)}
      />
      <KeyboardHelpModal isOpen={isKeyboardHelpOpen} onClose={() => setIsKeyboardHelpOpen(false)} />
      <TemplateSettingsModal isOpen={isTemplateSettingsOpen} onClose={() => setIsTemplateSettingsOpen(false)} />
      <OrganizationSettingsModal isOpen={isOrgSettingsOpen} onClose={() => setIsOrgSettingsOpen(false)} />

      {/* Left Navigation Rail */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onOpenOrgSettings={() => setIsOrgSettingsOpen(true)}
      />

      {/* Main Workspace Outer Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          isSidebarCollapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
      >
        {/* Auditor Read-Only Banner */}
        {activeRole === 'auditor' && (
          <div className="bg-amber-900 text-amber-100 text-xs font-semibold px-6 py-2 flex items-center justify-between shadow-xs border-b border-amber-800">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-[#D4F442]" />
              <span>Auditor / CA Read-Only Mode — Mutation controls restricted for accounting integrity.</span>
            </div>
          </div>
        )}

        {/* Top Context Bar */}
        <header className="bg-[#FAF9F5]/80 backdrop-blur-md border-b border-stone-900/[0.05] px-6 lg:px-10 py-3.5 flex items-center justify-between sticky top-0 z-20 transition-all">
          <div className="flex items-center space-x-3">
            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl hover:bg-stone-200/60 text-stone-600"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Context */}
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-extrabold text-stone-400 uppercase tracking-widest text-[10px]">
                {activeOrganization?.name || 'ACCURA'}
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-300" />
              <div className="flex items-center space-x-1.5">
                <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">
                  {contextInfo.eyebrow}
                </span>
                <span className="text-stone-300">•</span>
                <span className="font-extrabold text-stone-900 text-xs tracking-tight">
                  {contextInfo.title}
                </span>
              </div>
            </div>
          </div>

          {/* Right Top Context Bar Controls */}
          <div className="flex items-center space-x-3">
            {/* Global Search / Command Center Trigger */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center space-x-2.5 bg-white/90 hover:bg-white text-stone-700 px-3.5 py-1.5 rounded-xl border border-stone-900/[0.07] text-xs font-semibold cursor-pointer shadow-2xs hover:shadow-xs transition-all"
            >
              <Search className="w-3.5 h-3.5 text-stone-400" />
              <span className="hidden sm:inline text-stone-500 font-medium">Search or command...</span>
              <ShortcutHint type="commandPalette" />
            </button>

            {/* Live Sync Status Refresh */}
            <button
              onClick={handleRefreshAll}
              title="Refresh All Data (Ctrl+Shift+R)"
              className="flex items-center space-x-1.5 bg-white/90 hover:bg-white text-stone-700 px-3 py-1.5 rounded-xl border border-stone-900/[0.07] text-xs font-semibold cursor-pointer shadow-2xs transition-all"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isFetching > 0 ? 'animate-spin text-amber-600' : 'text-[#1E5E41]'
                }`}
              />
              <span className="hidden lg:inline text-[11px] font-bold text-stone-600">
                {isFetching > 0 ? 'Syncing...' : 'Live'}
              </span>
            </button>

            {/* Organization Switcher Dropdown */}
            {user?.organizations && user.organizations.length > 0 && (
              <div className="flex items-center space-x-1.5 bg-white/90 px-3 py-1 rounded-xl border border-stone-900/[0.07] text-xs shadow-2xs">
                <span className="text-stone-400 font-bold text-[10px] uppercase hidden sm:inline">Org:</span>
                <select
                  value={activeOrganization?.id || ''}
                  onChange={(e) => {
                    setActiveOrganizationId(Number(e.target.value));
                    queryClient.invalidateQueries();
                  }}
                  className="bg-transparent font-extrabold text-stone-900 focus:outline-none cursor-pointer text-xs pr-1"
                >
                  {user.organizations.map((org) => (
                    <option key={org.id} value={org.id} className="bg-white text-stone-900 font-semibold">
                      {org.name} ({org.pivot?.role.toUpperCase()})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setIsOrgSettingsOpen(true)}
                  title="Organization Settings"
                  className="p-1 hover:bg-stone-100 rounded-lg text-stone-500 hover:text-stone-900 transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Keyboard Help Trigger */}
            <button
              onClick={() => setIsKeyboardHelpOpen(true)}
              title="Keyboard Shortcuts Reference (?)"
              className="p-1.5 text-stone-400 hover:text-stone-800 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer"
            >
              <Keyboard className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Main Workspace Content Area */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto space-y-8 animate-fade-in-up">
          {children}
        </main>
      </div>

      {/* Persistent Global Mascot */}
      <Mascot />
    </div>
  );
};
