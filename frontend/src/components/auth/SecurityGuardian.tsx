import React, { useEffect, useRef, useState, useCallback } from 'react';

export type GuardianState = 'idle' | 'watching' | 'secure' | 'success' | 'denied';

interface SecurityGuardianProps {
  visible: boolean;
  eyesActive: boolean;
  state: GuardianState;
  focusedField: 'email' | 'password' | null;
  mouseX: number;
  mouseY: number;
  activeKey: string | null;
  reducedMotion: boolean;
  /** Ref callback to expose the laser emitter position */
  onEmitterRef?: (el: SVGCircleElement | null) => void;
}

export const SecurityGuardian: React.FC<SecurityGuardianProps> = ({
  visible,
  eyesActive,
  state,
  focusedField,
  mouseX,
  mouseY,
  activeKey: _activeKey,
  reducedMotion,
  onEmitterRef,
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Random blink every 4–7s
  const scheduleBlink = useCallback(() => {
    if (reducedMotion) return;
    const delay = 4000 + Math.random() * 3000;
    blinkTimerRef.current = setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        scheduleBlink();
      }, 150);
    }, delay);
  }, [reducedMotion]);

  useEffect(() => {
    if (eyesActive && !reducedMotion) {
      scheduleBlink();
    }
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, [eyesActive, reducedMotion, scheduleBlink]);

  // Pupil tracking
  const getPupilOffset = () => {
    if (reducedMotion) return { lx: 0, ly: 0, rx: 0, ry: 0 };

    if (focusedField === 'email') {
      // Look toward the right side (where form is)
      return { lx: 3, ly: 1, rx: 3, ry: 1 };
    }
    if (focusedField === 'password') {
      // Look slightly down-right
      return { lx: 2, ly: 2, rx: 2, ry: 2 };
    }

    // Follow mouse (subtle)
    const px = mouseX * 2.5;
    const py = mouseY * 1.5;
    return { lx: px, ly: py, rx: px, ry: py };
  };

  const pupil = getPupilOffset();

  const eyeStateClass = (() => {
    switch (state) {
      case 'success': return '--success';
      case 'denied': return '--denied';
      case 'secure': return '--secure';
      default: return eyesActive ? '--active' : '';
    }
  })();

  const lightStateClass = (() => {
    switch (state) {
      case 'success': return '--success';
      case 'denied': return '--denied';
      case 'secure': return '--secure';
      default: return eyesActive ? '--pulse' : '';
    }
  })();

  const containerClass = [
    'guardian-container',
    visible ? '--visible' : '',
    state === 'denied' ? '--shake' : '',
    state === 'success' ? '--success' : '',
  ].filter(Boolean).join(' ');

  const isVisorActive = focusedField === 'password' || state === 'secure';

  return (
    <div className={containerClass}>
      <svg
        className="guardian-svg"
        viewBox="0 0 200 340"
        width="200"
        height="340"
        fill="none"
        role="presentation"
        aria-hidden="true"
      >
        <g className={reducedMotion ? '' : 'guardian-body-group'}>
          {/* Base / Foundation */}
          <rect x="45" y="300" width="110" height="18" rx="6" fill="#2A2B30" />
          <rect x="50" y="296" width="100" height="10" rx="3" fill="#33343A" />

          {/* Body - vault-inspired */}
          <rect x="55" y="145" width="90" height="156" rx="10" fill="#1E1F24" />
          {/* Body inner panel */}
          <rect x="63" y="155" width="74" height="136" rx="6" fill="#25262B" />
          {/* Body detail lines */}
          <line x1="70" y1="175" x2="130" y2="175" stroke="#33343A" strokeWidth="0.5" />
          <line x1="70" y1="255" x2="130" y2="255" stroke="#33343A" strokeWidth="0.5" />

          {/* Vault dial / mechanical detail */}
          <circle cx="100" cy="215" r="14" fill="none" stroke="#3A3B42" strokeWidth="1" />
          <circle cx="100" cy="215" r="10" fill="none" stroke="#3A3B42" strokeWidth="0.5" />
          <circle cx="100" cy="215" r="3" fill="#3A3B42" />
          {/* Dial markers */}
          <line x1="100" y1="201" x2="100" y2="205" stroke="#4A4B52" strokeWidth="0.8" />
          <line x1="114" y1="215" x2="110" y2="215" stroke="#4A4B52" strokeWidth="0.8" />
          <line x1="100" y1="229" x2="100" y2="225" stroke="#4A4B52" strokeWidth="0.8" />
          <line x1="86" y1="215" x2="90" y2="215" stroke="#4A4B52" strokeWidth="0.8" />

          {/* Security lights (left) */}
          <rect
            className={`guardian-security-light ${lightStateClass}`}
            x="68" y="180" width="5" height="5" rx="1"
          />
          <rect
            className={`guardian-security-light ${lightStateClass}`}
            x="68" y="190" width="5" height="5" rx="1"
            style={{ animationDelay: '0.3s' }}
          />

          {/* Security lights (right) */}
          <rect
            className={`guardian-security-light ${lightStateClass}`}
            x="127" y="180" width="5" height="5" rx="1"
            style={{ animationDelay: '0.6s' }}
          />
          <rect
            className={`guardian-security-light ${lightStateClass}`}
            x="127" y="190" width="5" height="5" rx="1"
            style={{ animationDelay: '0.9s' }}
          />

          {/* Arms */}
          {/* Left arm */}
          <rect x="35" y="165" width="22" height="10" rx="5" fill="#2A2B30" />
          <rect x="28" y="170" width="12" height="50" rx="6" fill="#25262B" />
          <rect x="30" y="215" width="8" height="15" rx="4" fill="#2A2B30" />

          {/* Right arm (with laser emitter) */}
          <rect x="143" y="165" width="22" height="10" rx="5" fill="#2A2B30" />
          <rect x="160" y="170" width="12" height="50" rx="6" fill="#25262B" />
          {/* Laser emitter */}
          <circle
            className={`guardian-laser-emitter ${_activeKey ? '--firing' : ''}`}
            cx="166"
            cy="175"
            r="4"
            ref={onEmitterRef}
          />
          <circle cx="166" cy="175" r="2" fill="#3A3B42" />

          {/* Head - vault door shape */}
          <rect x="50" y="55" width="100" height="95" rx="16" fill="#1E1F24" />
          {/* Head inner panel */}
          <rect x="58" y="63" width="84" height="79" rx="10" fill="#25262B" />
          {/* Head top detail */}
          <rect x="80" y="48" width="40" height="12" rx="4" fill="#2A2B30" />
          {/* Antenna detail */}
          <rect x="96" y="38" width="8" height="14" rx="3" fill="#33343A" />
          <circle cx="100" cy="36" r="3" fill="#3A3B42" />

          {/* Head mechanical trim */}
          <line x1="65" y1="70" x2="78" y2="70" stroke="#3A3B42" strokeWidth="0.5" />
          <line x1="122" y1="70" x2="135" y2="70" stroke="#3A3B42" strokeWidth="0.5" />

          {/* Eyes */}
          {/* Left eye socket */}
          <rect x="68" y="88" width="24" height="20" rx="6" fill="#1A1B20" />
          {/* Left eye */}
          <rect
            className={`guardian-eye ${eyeStateClass}`}
            x="71" y="91" width="18" height="14" rx="4"
            fill="#3A3B42"
          />
          {/* Left pupil */}
          <circle
            className="guardian-pupil"
            cx="80"
            cy="98"
            r="3"
            fill="#1A1B20"
            style={{ transform: `translate(${pupil.lx}px, ${pupil.ly}px)` }}
          />
          {/* Left eyelid (blink) */}
          <rect
            className={`guardian-eyelid ${isBlinking ? '--blink' : ''}`}
            x="68" y="88" width="24" height="20" rx="6"
            fill="#1E1F24"
          />

          {/* Right eye socket */}
          <rect x="108" y="88" width="24" height="20" rx="6" fill="#1A1B20" />
          {/* Right eye */}
          <rect
            className={`guardian-eye ${eyeStateClass}`}
            x="111" y="91" width="18" height="14" rx="4"
            fill="#3A3B42"
          />
          {/* Right pupil */}
          <circle
            className="guardian-pupil"
            cx="120"
            cy="98"
            r="3"
            fill="#1A1B20"
            style={{ transform: `translate(${pupil.rx}px, ${pupil.ry}px)` }}
          />
          {/* Right eyelid (blink) */}
          <rect
            className={`guardian-eyelid ${isBlinking ? '--blink' : ''}`}
            x="108" y="88" width="24" height="20" rx="6"
            fill="#1E1F24"
          />

          {/* Visor (password mode) */}
          <rect
            className={`guardian-visor ${isVisorActive ? '--active' : ''}`}
            x="58" y="82" width="84" height="34" rx="6"
            fill="#1A1B20"
          />
          {/* Visor slits (visible when visor is active) */}
          {isVisorActive && (
            <g opacity="0.7">
              <rect x="70" y="94" width="20" height="3" rx="1" fill={state === 'secure' ? '#E8A838' : '#D4F442'} opacity="0.6" />
              <rect x="110" y="94" width="20" height="3" rx="1" fill={state === 'secure' ? '#E8A838' : '#D4F442'} opacity="0.6" />
            </g>
          )}

          {/* Mouth / speaker grille */}
          <g opacity="0.3">
            <line x1="85" y1="122" x2="115" y2="122" stroke="#3A3B42" strokeWidth="1" />
            <line x1="88" y1="126" x2="112" y2="126" stroke="#3A3B42" strokeWidth="0.8" />
            <line x1="91" y1="130" x2="109" y2="130" stroke="#3A3B42" strokeWidth="0.6" />
          </g>

          {/* Small document in hand (left) */}
          <g opacity="0.25" transform="translate(26, 198)">
            <rect x="0" y="0" width="14" height="18" rx="1.5" fill="none" stroke="#5A5F4B" strokeWidth="0.6" />
            <line x1="2.5" y1="4" x2="11.5" y2="4" stroke="#5A5F4B" strokeWidth="0.4" />
            <line x1="2.5" y1="7" x2="9" y2="7" stroke="#5A5F4B" strokeWidth="0.4" />
            <line x1="2.5" y1="10" x2="10" y2="10" stroke="#5A5F4B" strokeWidth="0.4" />
          </g>
        </g>
      </svg>
    </div>
  );
};
