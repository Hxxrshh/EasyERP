import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useBillingStore } from '../../store/useBillingStore';
import { apiClient } from '../../services/apiClient';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  Search,
  FilePlus,
  UserPlus,
  PackagePlus,
  MessageSquare,
  Users,
  Package,
  CreditCard,
  BookOpen,
  FolderKanban,
  FileText,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
  Building2,
  X,
  FileCheck,
  TrendingUp,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKeyboardHelp: () => void;
  onOpenNewClient?: () => void;
  onOpenNewProduct?: () => void;
  onOpenOrgSettings?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onOpenKeyboardHelp,
  onOpenNewClient,
  onOpenNewProduct,
  onOpenOrgSettings,
}) => {
  const { setActiveTab, setWhatsAppDrawerOpen, setSelectedClientId } = useBillingStore();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [searchResults, setSearchResults] = useState<{
    clients: any[];
    invoices: any[];
    products: any[];
    payments: any[];
  }>({ clients: [], invoices: [], products: [], payments: [] });
  const [isSearchingApi, setIsSearchingApi] = useState(false);

  const { activeRole } = useAuth();

  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setSearchResults({ clients: [], invoices: [], products: [], payments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingApi(true);
      try {
        const res = await apiClient.get<any>(`/search?query=${encodeURIComponent(search)}`);
        setSearchResults({
          clients: res.clients || [],
          invoices: res.invoices || [],
          products: res.products || [],
          payments: res.payments || [],
        });
      } catch {
        // Ignore live search errors
      } finally {
        setIsSearchingApi(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  if (!isOpen) return null;

  const staticActions = [
    {
      label: 'New Invoice / Billing Workspace',
      category: 'Actions',
      icon: FilePlus,
      hint: 'newBill' as const,
      run: () => setActiveTab('billing'),
    },
    {
      label: 'Add New Customer Record',
      category: 'Actions',
      icon: UserPlus,
      hint: 'newClient' as const,
      run: () => onOpenNewClient?.(),
    },
    {
      label: 'Add New Catalog Item / Product',
      category: 'Actions',
      icon: PackagePlus,
      hint: 'newProduct' as const,
      run: () => onOpenNewProduct?.(),
    },
    {
      label: 'Organization Profile & Context Switcher',
      category: 'Actions',
      icon: Building2,
      run: () => onOpenOrgSettings?.(),
    },
    {
      label: 'Record Payment & FIFO Allocation',
      category: 'Actions',
      icon: CreditCard,
      hint: 'recordPayment' as const,
      run: () => setActiveTab('payments'),
    },
    {
      label: 'Open WhatsApp Order Parser',
      category: 'Actions',
      icon: MessageSquare,
      hint: 'parser' as const,
      run: () => setWhatsAppDrawerOpen(true),
    },
    {
      label: 'Refresh All Workspace Data',
      category: 'Actions',
      icon: RefreshCw,
      hint: 'refresh' as const,
      run: () => queryClient.invalidateQueries(),
    },
    {
      label: 'Customer Directory & Accounts',
      category: 'Navigation',
      icon: Users,
      run: () => setActiveTab('customers'),
    },
    {
      label: 'Products & Price Resolution',
      category: 'Navigation',
      icon: Package,
      run: () => setActiveTab('products'),
    },
    {
      label: 'Physical Inventory & Movements',
      category: 'Navigation',
      icon: Package,
      run: () => setActiveTab('inventory'),
    },
    {
      label: 'Authoritative Customer Ledger',
      category: 'Navigation',
      icon: BookOpen,
      run: () => setActiveTab('ledger'),
    },
    {
      label: 'Document Lifecycle Registry',
      category: 'Navigation',
      icon: FolderKanban,
      run: () => setActiveTab('documents'),
    },
    {
      label: 'Tax & Accounting Reports Center',
      category: 'Navigation',
      icon: FileText,
      run: () => setActiveTab('reports'),
    },
    ...(activeRole === 'admin' || activeRole === 'auditor'
      ? [
          {
            label: 'System Security & Audit Trail',
            category: 'Navigation',
            icon: ShieldCheck,
            run: () => setActiveTab('audit'),
          },
        ]
      : []),
    {
      label: 'Show Keyboard Shortcuts Reference',
      category: 'Help',
      icon: HelpCircle,
      run: () => onOpenKeyboardHelp(),
    },
  ];

  const apiActionResults: any[] = [];

  searchResults.clients.forEach((c) => {
    apiActionResults.push({
      label: `Customer: ${c.name} (${c.gst_number || 'URP'})`,
      category: 'Live Search Results',
      icon: Users,
      run: () => {
        setSelectedClientId(c.id);
        setActiveTab('customers');
      },
    });
  });

  searchResults.invoices.forEach((inv) => {
    apiActionResults.push({
      label: `Invoice #${inv.invoice_number} — ${inv.client?.name || 'Client'} (₹${Number(inv.total_amount).toLocaleString('en-IN')})`,
      category: 'Live Search Results',
      icon: FileCheck,
      run: () => {
        setActiveTab('documents');
      },
    });
  });

  searchResults.products.forEach((p) => {
    apiActionResults.push({
      label: `Product: ${p.name} (HSN ${p.hsn_code || 'N/A'}) — ₹${p.base_price}/${p.unit}`,
      category: 'Live Search Results',
      icon: Package,
      run: () => {
        setActiveTab('products');
      },
    });
  });

  searchResults.payments.forEach((p) => {
    apiActionResults.push({
      label: `Payment: ${p.transaction_reference} — ${p.client?.name || 'Client'} (₹${Number(p.amount).toLocaleString('en-IN')})`,
      category: 'Live Search Results',
      icon: TrendingUp,
      run: () => {
        setActiveTab('payments');
      },
    });
  });

  const combinedActions = [
    ...apiActionResults,
    ...staticActions.filter(
      (a) =>
        a.label.toLowerCase().includes(search.toLowerCase()) ||
        a.category.toLowerCase().includes(search.toLowerCase())
    ),
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, combinedActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + combinedActions.length) % Math.max(1, combinedActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (combinedActions[selectedIndex]) {
        combinedActions[selectedIndex].run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-[#FAF9F5] max-w-xl w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Search Header */}
        <div className="p-4 border-b border-stone-900/[0.06] flex items-center space-x-3 bg-white/90">
          <Search className="w-5 h-5 text-stone-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command, customer, invoice #, or item..."
            className="w-full text-xs font-bold bg-transparent focus:outline-none text-stone-900 placeholder:text-stone-400"
          />
          {isSearchingApi && <RefreshCw className="w-4 h-4 text-stone-900 animate-spin shrink-0" />}
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Live Search List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {combinedActions.length === 0 ? (
            <div className="p-6 text-center text-xs text-stone-400 italic">
              No matching ERP commands or records found.
            </div>
          ) : (
            combinedActions.map((action, idx) => {
              const Icon = action.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={idx}
                  onClick={() => {
                    action.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-bold text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#121316] text-[#FAF9F5] shadow-xs translate-x-0.5'
                      : 'text-stone-800 hover:bg-stone-200/50'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#D4F442]' : 'text-stone-500'}`} />
                    <span className="truncate">{action.label}</span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-[9px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-stone-800 text-[#D4F442]'
                          : 'bg-stone-200/60 text-stone-500'
                      }`}
                    >
                      {action.category}
                    </span>
                    {action.hint && <ShortcutHint type={action.hint} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="p-3 bg-stone-100/70 border-t border-stone-900/[0.05] flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-wider">
          <div>Use ↑ ↓ to navigate</div>
          <div>↵ to select</div>
          <div>Esc to close</div>
        </div>
      </div>
    </div>
  );
};
