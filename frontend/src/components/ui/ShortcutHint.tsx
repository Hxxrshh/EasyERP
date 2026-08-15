import React from 'react';

export type ShortcutType = 'parser' | 'addLineItem' | 'saveDraft' | 'commandPalette' | 'escape' | 'enter';

interface ShortcutHintProps {
  type?: ShortcutType;
  keys?: string[];
  className?: string;
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({ type, keys, className = '' }) => {
  const isMac = typeof window !== 'undefined' && /mac/i.test(navigator.userAgent || navigator.platform);

  let keyDisplay: string[] = [];

  if (keys) {
    keyDisplay = keys;
  } else if (type === 'parser') {
    keyDisplay = [isMac ? '⌥' : 'Alt', 'P'];
  } else if (type === 'addLineItem') {
    keyDisplay = [isMac ? '⌥' : 'Alt', 'N'];
  } else if (type === 'saveDraft') {
    keyDisplay = [isMac ? '⌘' : 'Ctrl', 'S'];
  } else if (type === 'commandPalette') {
    keyDisplay = [isMac ? '⌘' : 'Ctrl', 'K'];
  } else if (type === 'escape') {
    keyDisplay = ['Esc'];
  } else if (type === 'enter') {
    keyDisplay = ['↵'];
  }

  return (
    <span className={`inline-flex items-center space-x-0.5 ${className}`}>
      {keyDisplay.map((k, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 text-[10px] font-mono font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded shadow-2xs"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
};
