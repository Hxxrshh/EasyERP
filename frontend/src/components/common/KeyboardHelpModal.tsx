import React from 'react';
import { ShortcutHint } from '../ui/ShortcutHint';
import { Keyboard, X, Info } from 'lucide-react';

interface KeyboardHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardHelpModal: React.FC<KeyboardHelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Keyboard className="w-5 h-5 text-blue-400" />
            <h2 className="font-bold text-base">Keyboard Shortcuts Reference</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              All keyboard shortcuts are optional shortcuts for fast office operation. All features remain 100% accessible via standard mouse clicks.
            </span>
          </div>

          <div className="space-y-3">
            {/* Billing Shortcuts */}
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Billing Workspace</h3>
              <div className="border rounded-lg divide-y divide-slate-100 bg-slate-50">
                <div className="p-2.5 flex justify-between items-center bg-white">
                  <span className="text-slate-700">Save Draft Invoice</span>
                  <ShortcutHint type="saveDraft" />
                </div>
                <div className="p-2.5 flex justify-between items-center bg-white">
                  <span className="text-slate-700">Add Line Item Row</span>
                  <ShortcutHint type="addLineItem" />
                </div>
                <div className="p-2.5 flex justify-between items-center bg-white">
                  <span className="text-slate-700">Toggle WhatsApp Smart Parser</span>
                  <ShortcutHint type="parser" />
                </div>
              </div>
            </div>

            {/* Navigation Shortcuts */}
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Global Navigation</h3>
              <div className="border rounded-lg divide-y divide-slate-100 bg-slate-50">
                <div className="p-2.5 flex justify-between items-center bg-white">
                  <span className="text-slate-700">Open Command Palette</span>
                  <ShortcutHint type="commandPalette" />
                </div>
                <div className="p-2.5 flex justify-between items-center bg-white">
                  <span className="text-slate-700">Close Overlay / Drawer / Modal</span>
                  <ShortcutHint type="escape" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg transition-colors"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
