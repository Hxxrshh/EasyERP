import React from 'react';
import { ShortcutHint } from '../ui/ShortcutHint';
import { Keyboard, X, Info } from 'lucide-react';
import { Button } from '../ui/Button';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-2xl border border-stone-900/[0.08] overflow-hidden flex flex-col animate-pop-in">
        {/* Header */}
        <div className="p-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Keyboard className="w-5 h-5 text-[#D4F442]" />
            <h2 className="font-extrabold text-sm tracking-tight text-white">Keyboard Shortcuts Reference</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-stone-800 text-stone-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl text-stone-700 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
            <span>
              All keyboard shortcuts are optional accelerators for fast accounting operations. All features remain 100% accessible via standard navigation.
            </span>
          </div>

          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-stone-400 uppercase tracking-widest text-[10px]">Primary Operations</h3>
              <div className="border border-stone-100 rounded-2xl divide-y divide-stone-100 bg-white overflow-hidden">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">New Bill / Invoice</span>
                  <ShortcutHint type="newBill" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Add New Customer</span>
                  <ShortcutHint type="newClient" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Add New Product</span>
                  <ShortcutHint type="newProduct" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Record Payment Receipt</span>
                  <ShortcutHint type="recordPayment" />
                </div>
              </div>
            </div>

            {/* Billing Editor */}
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-stone-400 uppercase tracking-widest text-[10px]">Invoice Composer</h3>
              <div className="border border-stone-100 rounded-2xl divide-y divide-stone-100 bg-white overflow-hidden">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Save Draft Document</span>
                  <ShortcutHint type="saveDraft" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Add Line Item Row</span>
                  <ShortcutHint type="addLineItem" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Toggle WhatsApp Order Parser</span>
                  <ShortcutHint type="parser" />
                </div>
              </div>
            </div>

            {/* Global Navigation */}
            <div className="space-y-1.5">
              <h3 className="font-extrabold text-stone-400 uppercase tracking-widest text-[10px]">System & Global Context</h3>
              <div className="border border-stone-100 rounded-2xl divide-y divide-stone-100 bg-white overflow-hidden">
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Open Global Command Palette</span>
                  <ShortcutHint type="commandPalette" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Refresh All Workspace Data</span>
                  <ShortcutHint type="refresh" />
                </div>
                <div className="p-3 flex justify-between items-center">
                  <span className="text-stone-800 font-bold">Close Overlay / Drawer / Modal</span>
                  <ShortcutHint type="escape" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close Reference
          </Button>
        </div>
      </div>
    </div>
  );
};
