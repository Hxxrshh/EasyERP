import React, { useState, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore } from '../../store/useBillingStore';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { ShortcutHint } from '../ui/ShortcutHint';
import { CommandPalette } from '../common/CommandPalette';
import { KeyboardHelpModal } from '../common/KeyboardHelpModal';
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
  Building2,
  LogOut,
  ShieldAlert,
  MessageSquare,
  Keyboard,
  Search,
} from 'lucide-react';

interface AppShellProps {
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { user, activeOrganization, activeRole, setActiveOrganizationId, logout } = useAuth();
  const { activeTab, setActiveTab, setWhatsAppDrawerOpen } = useBillingStore();

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isKeyboardHelpOpen, setIsKeyboardHelpOpen] = useState(false);

  // Central keyboard shortcuts listener
  useKeyboardShortcuts({
    onToggleParser: () => setWhatsAppDrawerOpen(true),
    onToggleCommandPalette: () => setIsCommandPaletteOpen((prev) => !prev),
    onEscape: () => {
      setIsCommandPaletteOpen(false);
      setIsKeyboardHelpOpen(false);
      setWhatsAppDrawerOpen(false);
    },
  });

  const navItems = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'billing', label: 'Billing Workspace', icon: FileSpreadsheet },
    { key: 'customers', label: 'Customers', icon: Users },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'payments', label: 'Payments', icon: CreditCard },
    { key: 'ledger', label: 'Ledger', icon: BookOpen },
    { key: 'documents', label: 'Documents', icon: FolderKanban },
    { key: 'reports', label: 'Reports & Tax', icon: FileText },
    { key: 'audit', label: 'Audit Trail', icon: ShieldCheck },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      {/* Modals & Overlays */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenKeyboardHelp={() => {
          setIsCommandPaletteOpen(false);
          setIsKeyboardHelpOpen(true);
        }}
      />
      <KeyboardHelpModal isOpen={isKeyboardHelpOpen} onClose={() => setIsKeyboardHelpOpen(false)} />

      {/* Auditor Read-Only Banner */}
      {activeRole === 'auditor' && (
        <div className="bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Auditor / CA Mode Active — Read-Only Access Enabled. Mutation controls are restricted for accounting integrity.</span>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none text-white">
              LR Billing & Ledger Automator
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Authoritative Indian GST & Ledger System</p>
          </div>
        </div>

        {/* Center Search / Command Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="hidden md:flex items-center space-x-3 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
        >
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <span>Search or command...</span>
          <ShortcutHint type="commandPalette" />
        </button>

        <div className="flex items-center space-x-4">
          {/* Organization Switcher Dropdown */}
          {user?.organizations && user.organizations.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-xs text-slate-400 font-semibold">Org:</span>
              <select
                value={activeOrganization?.id || ''}
                onChange={(e) => setActiveOrganizationId(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {user.organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                    {org.name} ({org.state})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Keyboard Help & User Profile */}
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
            <button
              onClick={() => setIsKeyboardHelpOpen(true)}
              title="Keyboard Shortcuts Reference"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-blue-400" />
            </button>

            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400">
                {activeRole || 'Operator'}
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Sub-Bar */}
      <nav className="bg-white border-b border-slate-200 px-6 flex items-center justify-between overflow-x-auto shadow-xs">
        <div className="flex space-x-1 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key as any)}
                className={`px-3.5 py-2.5 rounded-md text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600 rounded-b-none'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* WhatsApp Quick Action Button */}
        <button
          onClick={() => setWhatsAppDrawerOpen(true)}
          className="my-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-md text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
          <span>WhatsApp Parser</span>
          <ShortcutHint type="parser" className="ml-1" />
        </button>
      </nav>

      {/* Main Content Workspace */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
};
