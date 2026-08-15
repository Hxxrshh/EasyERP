import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleParser?: () => void;
  onAddLineItem?: () => void;
  onSaveDraft?: () => void;
  onToggleCommandPalette?: () => void;
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

      // Cmd + K or Ctrl + K -> Toggle Command Palette (allowed anywhere)
      if ((event.metaKey || event.ctrlKey) && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        handlers.onToggleCommandPalette?.();
        return;
      }

      // Cmd + S or Ctrl + S -> Save Draft (allowed anywhere, prevents browser page save)
      if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        handlers.onSaveDraft?.();
        return;
      }

      // Ignore single modifier shortcuts if user is typing inside input elements
      if (isInput) return;

      // Option + P or Alt + P -> Toggle WhatsApp Parser
      if (event.altKey && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        handlers.onToggleParser?.();
      }

      // Option + N or Alt + N -> Add Line Item
      if (event.altKey && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        handlers.onAddLineItem?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
