import React from 'react';
import { useBillingStore } from '../../store/useBillingStore';
import { useAuth } from '../../context/AuthContext';
import { ShortcutHint } from '../ui/ShortcutHint';
import {
  FilePlus,
  CreditCard,
  UserPlus,
  PackagePlus,
  MessageSquare,
  FileText,
  BookOpen,
} from 'lucide-react';

interface QuickActionBarProps {
  onOpenNewClient?: () => void;
  onOpenNewProduct?: () => void;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  onOpenNewClient,
  onOpenNewProduct,
}) => {
  const { setActiveTab, setWhatsAppDrawerOpen } = useBillingStore();
  const { activeRole } = useAuth();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center space-x-2">
        <span className="font-extrabold uppercase text-[10px] text-slate-400 tracking-wider">Quick Actions:</span>
        
        <button
          onClick={() => setActiveTab('billing')}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-colors"
        >
          <FilePlus className="w-3.5 h-3.5" />
          <span>New Bill</span>
          <ShortcutHint type="newBill" className="ml-1" />
        </button>

        {activeRole !== 'auditor' && (
          <>
            <button
              onClick={() => onOpenNewClient?.()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Customer</span>
              <ShortcutHint type="newClient" className="ml-1" />
            </button>

            <button
              onClick={() => onOpenNewProduct?.()}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors"
            >
              <PackagePlus className="w-3.5 h-3.5 text-blue-600" />
              <span>+ Product</span>
              <ShortcutHint type="newProduct" className="ml-1" />
            </button>
          </>
        )}

        <button
          onClick={() => setActiveTab('payments')}
          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg flex items-center space-x-1.5 cursor-pointer transition-colors"
        >
          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
          <span>Record Payment</span>
          <ShortcutHint type="recordPayment" className="ml-1" />
        </button>

        <button
          onClick={() => setWhatsAppDrawerOpen(true)}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>WhatsApp Parser</span>
        </button>
      </div>

      <div className="flex items-center space-x-2 text-slate-500 font-medium">
        <button
          onClick={() => setActiveTab('ledger')}
          className="hover:text-blue-600 hover:underline flex items-center space-x-1"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ledger Statement</span>
        </button>
        <span>•</span>
        <button
          onClick={() => setActiveTab('reports')}
          className="hover:text-blue-600 hover:underline flex items-center space-x-1"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Tax Reports</span>
        </button>
      </div>
    </div>
  );
};
