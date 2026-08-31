import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleParser?: () => void;
  onAddLineItem?: () => void;
  onSaveDraft?: () => void;
  onToggleCommandPalette?: () => void;
  onNewBill?: () => void;
  onNewClient?: () => void;
  onNewProduct?: () => void;
  onRecordPayment?: () => void;
  onRefresh?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      // Cmd + Shift + R or Ctrl + Shift + R -> Refresh Current Data
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        handlers.onRefresh?.();
        return;
      }

      // Cmd + K or Ctrl + K -> Toggle Command Palette
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        handlers.onToggleCommandPalette?.();
        return;
      }

      // Cmd + S or Ctrl + S -> Save Draft
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        handlers.onSaveDraft?.();
        return;
      }

      // Cmd + N or Ctrl + N -> New Bill
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        handlers.onNewBill?.();
        return;
      }

      // Ignore single modifier shortcuts if user is typing inside input elements
      if (isInput) return;

      // Option + P or Alt + P -> Toggle WhatsApp Parser / New Product
      if (event.altKey && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        if (handlers.onNewProduct) {
          handlers.onNewProduct();
        } else if (handlers.onToggleParser) {
          handlers.onToggleParser();
        }
      }

      // Option + N or Alt + N -> Add Line Item
      if (event.altKey && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        handlers.onAddLineItem?.();
      }

      // Option + C or Alt + C -> New Customer
      if (event.altKey && (event.key === 'c' || event.key === 'C')) {
        event.preventDefault();
        handlers.onNewClient?.();
      }

      // Option + R or Alt + R -> Record Payment
      if (event.altKey && (event.key === 'r' || event.key === 'R')) {
        event.preventDefault();
        handlers.onRecordPayment?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
