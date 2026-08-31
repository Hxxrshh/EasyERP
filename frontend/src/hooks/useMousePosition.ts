import { useEffect, useRef, useState } from 'react';

interface MousePosition {
  /** Smoothed X in [-1, 1] range */
  x: number;
  /** Smoothed Y in [-1, 1] range */
  y: number;
  /** Raw pixel X */
  rawX: number;
  /** Raw pixel Y */
  rawY: number;
}

const LERP_FACTOR = 0.08;

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export function useMousePosition(enabled = true): MousePosition {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0, rawX: 0, rawY: 0 });
  const targetRef = useRef({ x: 0, y: 0, rawX: 0, rawY: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRef.current = { x: nx, y: ny, rawX: e.clientX, rawY: e.clientY };
    };

    const animate = () => {
      const t = targetRef.current;
      const c = currentRef.current;

      c.x = lerp(c.x, t.x, LERP_FACTOR);
      c.y = lerp(c.y, t.y, LERP_FACTOR);

      setPosition({ x: c.x, y: c.y, rawX: t.rawX, rawY: t.rawY });
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  return position;
}
