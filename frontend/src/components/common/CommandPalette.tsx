import React, { useState } from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  Search,
  FilePlus,
  MessageSquare,
  Users,
  Package,
  CreditCard,
  BookOpen,
  FolderKanban,
  FileText,
  ShieldCheck,
  HelpCircle,
  X,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenKeyboardHelp: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenKeyboardHelp }) => {
  const { setActiveTab, setWhatsAppDrawerOpen } = useBillingStore();
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!isOpen) return null;

  const actions = [
    {
      label: 'New Invoice / Document',
      category: 'Actions',
      icon: FilePlus,
      run: () => setActiveTab('billing'),
    },
    {
      label: 'Open WhatsApp Smart Parser',
      category: 'Actions',
      icon: MessageSquare,
      hint: 'parser' as const,
      run: () => setWhatsAppDrawerOpen(true),
    },
    {
      label: 'Navigate to Customer Directory',
      category: 'Navigation',
      icon: Users,
      run: () => setActiveTab('customers'),
    },
    {
      label: 'Navigate to Product Catalog',
      category: 'Navigation',
      icon: Package,
      run: () => setActiveTab('products'),
    },
    {
      label: 'Navigate to Payments Workspace',
      category: 'Navigation',
      icon: CreditCard,
      run: () => setActiveTab('payments'),
    },
    {
      label: 'Navigate to Authoritative Ledger',
      category: 'Navigation',
      icon: BookOpen,
      run: () => setActiveTab('ledger'),
    },
    {
      label: 'Navigate to Document Registry',
      category: 'Navigation',
      icon: FolderKanban,
      run: () => setActiveTab('documents'),
    },
    {
      label: 'Navigate to Tax & Reports Center',
      category: 'Navigation',
      icon: FileText,
      run: () => setActiveTab('reports'),
    },
    {
      label: 'Navigate to System Audit Trail',
      category: 'Navigation',
      icon: ShieldCheck,
      run: () => setActiveTab('audit'),
    },
    {
      label: 'Show Keyboard Shortcuts Reference',
      category: 'Help',
      icon: HelpCircle,
      run: () => onOpenKeyboardHelp(),
    },
  ];

  const filteredActions = actions.filter((a) =>
    a.label.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredActions.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredActions.length) % Math.max(1, filteredActions.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
      <div className="bg-white max-w-xl w-full rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Search Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center space-x-3 bg-slate-50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search workspace..."
            className="w-full text-sm font-semibold bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
          />
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredActions.map((action, idx) => {
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
                className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected ? 'bg-blue-600 text-white' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <span>{action.label}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                    {action.category}
                  </span>
                  {action.hint && <ShortcutHint type={action.hint} />}
                </div>
              </button>
            );
          })}

          {filteredActions.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-400 italic">No matching actions found.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400 flex items-center justify-between">
          <span>Use <ShortcutHint keys={['↑', '↓']} /> to navigate, <ShortcutHint keys={['↵']} /> to execute</span>
          <ShortcutHint type="escape" />
        </div>
      </div>
    </div>
  );
};
