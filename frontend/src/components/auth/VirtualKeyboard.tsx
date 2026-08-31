import React, { useRef, useCallback } from 'react';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface VirtualKeyboardProps {
  visible: boolean;
  activeKey: string | null;
  /** Callback to get the position of a key element */
  onKeyRefMap?: (map: Map<string, DOMRect>) => void;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  visible,
  activeKey,
  onKeyRefMap,
}) => {
  const keyRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());

  const setKeyRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      if (el) {
        keyRefsMap.current.set(key, el);
      } else {
        keyRefsMap.current.delete(key);
      }
    },
    [],
  );

  // Expose positions to parent when active key changes
  React.useEffect(() => {
    if (activeKey && onKeyRefMap) {
      const map = new Map<string, DOMRect>();
      keyRefsMap.current.forEach((el, key) => {
        map.set(key, el.getBoundingClientRect());
      });
      onKeyRefMap(map);
    }
  }, [activeKey, onKeyRefMap]);

  return (
    <div
      className={`virtual-keyboard ${visible ? '--visible' : ''}`}
      role="presentation"
      aria-hidden="true"
    >
      {ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="vk-row"
          style={{ paddingLeft: rowIndex === 1 ? '14px' : rowIndex === 2 ? '30px' : '0' }}
        >
          {row.map((key) => (
            <div
              key={key}
              ref={setKeyRef(key)}
              className={`vk-key ${activeKey?.toUpperCase() === key ? '--active' : ''}`}
            >
              {key}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
