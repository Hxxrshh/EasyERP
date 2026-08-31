import React from 'react';

export type ShortcutType =
  | 'parser'
  | 'addLineItem'
  | 'saveDraft'
  | 'commandPalette'
  | 'escape'
  | 'enter'
  | 'newBill'
  | 'newClient'
  | 'newProduct'
  | 'recordPayment'
  | 'refresh';

interface ShortcutHintProps {
  type?: ShortcutType;
  keys?: string[];
  className?: string;
  forceMacDisplay?: boolean;
}

export const ShortcutHint: React.FC<ShortcutHintProps> = ({ type, keys, className = '', forceMacDisplay = false }) => {
  const isMac = forceMacDisplay;

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
  } else if (type === 'newBill') {
    keyDisplay = [isMac ? '⌘' : 'Ctrl', 'N'];
  } else if (type === 'newClient') {
    keyDisplay = [isMac ? '⌥' : 'Alt', 'C'];
  } else if (type === 'newProduct') {
    keyDisplay = [isMac ? '⌥' : 'Alt', 'P'];
  } else if (type === 'recordPayment') {
    keyDisplay = [isMac ? '⌥' : 'Alt', 'R'];
  } else if (type === 'refresh') {
    keyDisplay = [isMac ? '⌘' : 'Ctrl', 'Shift', 'R'];
  }

  return (
    <span className={`inline-flex items-center space-x-0.5 ${className}`}>
      {keyDisplay.map((k, i) => (
        <kbd
          key={i}
          className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-stone-100 text-stone-700 border border-stone-300/80 rounded-md shadow-2xs"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
};
