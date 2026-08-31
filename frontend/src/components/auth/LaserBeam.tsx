import React, { useEffect, useState } from 'react';

interface LaserBeamProps {
  firing: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export const LaserBeam: React.FC<LaserBeamProps> = ({ firing, fromX, fromY, toX, toY }) => {
  const [showReturn, setShowReturn] = useState(false);

  useEffect(() => {
    if (firing) {
      const t = setTimeout(() => setShowReturn(true), 80);
      const t2 = setTimeout(() => setShowReturn(false), 220);
      return () => {
        clearTimeout(t);
        clearTimeout(t2);
      };
    } else {
      setShowReturn(false);
    }
  }, [firing]);

  return (
    <svg className="laser-overlay" aria-hidden="true">
      {/* Glow filter definition */}
      <defs>
        <filter id="laserGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main beam: guardian emitter → key */}
      <line
        className={`laser-beam ${firing ? '--firing' : ''}`}
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
      />

      {/* Return beam: key → guardian (thinner, delayed) */}
      <line
        className={`laser-beam-return ${showReturn ? '--firing' : ''}`}
        x1={toX}
        y1={toY}
        x2={fromX}
        y2={fromY}
      />
    </svg>
  );
};
