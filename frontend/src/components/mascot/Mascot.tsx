import React, { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { uiEventBus } from '../../services/uiEventBus';
import type { UIEvent } from '../../services/uiEventBus';
import { useBillingStore } from '../../store/useBillingStore';
import './Mascot.css';

export type MascotState = 'idle' | 'happy' | 'working' | 'concerned' | 'success';

interface MascotMessage {
  primary: string;
  secondary?: string;
}

export const Mascot: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const { activeTab } = useBillingStore();
  
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [message, setMessage] = useState<MascotMessage | null>(null);
  const [isMinimized, setIsMinimized] = useState(() => {
    return localStorage.getItem('lr_billing_mascot_minimized') === 'true';
  });

  const messageTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const stateTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Define eye tracking state
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion || isMinimized) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Basic eye tracking (similar to SecurityGuardian but simpler)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setEyePos({ x: x * 4, y: y * 4 });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion, isMinimized]);

  // Contextual idle messages based on tab
  useEffect(() => {
    if (message !== null) return; // Don't override an active event message
    
    let idleMsg: MascotMessage | null = null;
    switch (activeTab) {
      case 'overview':
        idleMsg = { primary: "Want a quick look at today's numbers?" };
        break;
      case 'ledger':
        idleMsg = { primary: "Ready to check the books." };
        break;
      case 'payments':
        idleMsg = { primary: "Money is moving." };
        break;
      case 'inventory':
        idleMsg = { primary: "Let's see what's in the warehouse." };
        break;
    }

    if (idleMsg) {
      // Show contextual message briefly when switching tabs
      showMessage(idleMsg.primary, idleMsg.secondary, 4000);
    }
  }, [activeTab]);

  const showMessage = (primary: string, secondary?: string, duration = 4000) => {
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    setMessage({ primary, secondary });
    
    if (duration > 0) {
      messageTimeoutRef.current = setTimeout(() => {
        setMessage(null);
      }, duration);
    }
  };

  const temporaryState = (newState: MascotState, duration = 3000) => {
    if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
    setMascotState(newState);
    
    stateTimeoutRef.current = setTimeout(() => {
      setMascotState('idle');
    }, duration);
  };

  useEffect(() => {
    const handleUIEvent = (event: UIEvent) => {
      switch (event.type) {
        case 'PAYMENT_RECEIVED':
          temporaryState('happy', 4000);
          showMessage(`₹${event.payload?.amount?.toLocaleString('en-IN') || 'Payment'} received.`, "Someone just made the ledger happier.");
          break;
        case 'INVOICE_CREATED':
          temporaryState('success', 3000);
          showMessage("Invoice ready.", "Officially official.");
          break;
        case 'INVOICE_FINALIZED':
          temporaryState('success', 3000);
          showMessage("Invoice finalized.", "No going back now.");
          break;
        case 'LEDGER_LOADING':
          setMascotState('working');
          break;
        case 'LEDGER_READY':
          setMascotState('idle');
          showMessage("Ledger found.", "Ready for review.", 3000);
          break;
        case 'EXPORT_STARTED':
          setMascotState('working');
          break;
        case 'EXPORT_SUCCESS':
          temporaryState('success', 4000);
          showMessage("Export ready.", "Your spreadsheet has escaped.");
          break;
        case 'API_ERROR':
          temporaryState('concerned', 5000);
          showMessage("Hmm... something went wrong.", event.payload?.message);
          break;
        case 'PARSER_STARTED':
          setMascotState('working');
          break;
        case 'PARSER_COMPLETED':
          temporaryState('success', 3000);
          showMessage("I understood that.", "Data extracted successfully.");
          break;
        case 'INVENTORY_STOCK_IN':
        case 'INVENTORY_STOCK_OUT':
          temporaryState('idle', 3000);
          showMessage(event.type === 'INVENTORY_STOCK_IN' ? "Stock added." : "Stock removed.");
          break;
        case 'LOW_STOCK':
          temporaryState('concerned', 5000);
          showMessage("Running low.", "Check warehouse levels.");
          break;
      }
    };

    const unsubscribe = uiEventBus.subscribe(handleUIEvent);
    return () => unsubscribe();
  }, []);

  const toggleMinimize = () => {
    const newVal = !isMinimized;
    setIsMinimized(newVal);
    localStorage.setItem('lr_billing_mascot_minimized', String(newVal));
  };

  // SVG configuration based on state
  const lightColor = mascotState === 'happy' ? '#D4F442' : 
                     mascotState === 'concerned' ? '#F87171' : 
                     mascotState === 'working' ? '#60A5FA' : 
                     mascotState === 'success' ? '#10B981' : 
                     '#D4F442';

  const mouthPath = mascotState === 'happy' ? 'M 25 50 Q 40 65 55 50' :
                    mascotState === 'concerned' ? 'M 30 55 Q 40 45 50 55' :
                    mascotState === 'working' ? 'M 35 52 L 45 52' :
                    mascotState === 'success' ? 'M 25 50 Q 40 60 55 50' :
                    'M 30 52 Q 40 55 50 52';

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={toggleMinimize}
          className="w-10 h-10 rounded-full bg-white shadow-lg border border-stone-200 flex items-center justify-center text-stone-500 hover:text-stone-800 transition-colors"
          title="Show Ledger Companion"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="mascot-container">
      {/* Speech Bubble */}
      <div className={`mascot-bubble ${message ? '--visible' : ''}`}>
        {message && (
          <>
            <div className="mascot-bubble-primary">{message.primary}</div>
            {message.secondary && <div className="mascot-bubble-secondary">{message.secondary}</div>}
          </>
        )}
      </div>

      {/* Mascot SVG */}
      <div className={`mascot-svg-wrapper --${mascotState}`} onClick={toggleMinimize} title="Click to hide">
        <svg viewBox="0 0 80 80" className="mascot-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main Body */}
          <rect x="15" y="20" width="50" height="45" rx="16" fill="#FAF9F5" stroke="#1C1917" strokeWidth="3" />
          
          {/* Antenna/Light */}
          <path d="M40 20 L40 10" stroke="#1C1917" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="8" r="4" fill={lightColor} className="mascot-light" />
          <circle cx="40" cy="8" r="4" stroke="#1C1917" strokeWidth="2" />

          {/* Screen / Visor */}
          <rect x="22" y="28" width="36" height="20" rx="6" fill="#1C1917" />
          
          {/* Eyes Group (with tracking) */}
          <g className="mascot-eyes" style={{ transform: `translate(${eyePos.x}px, ${eyePos.y}px)` }}>
            {mascotState === 'concerned' ? (
              <>
                <line x1="28" y1="36" x2="34" y2="40" stroke={lightColor} strokeWidth="2" strokeLinecap="round" />
                <line x1="52" y1="36" x2="46" y2="40" stroke={lightColor} strokeWidth="2" strokeLinecap="round" />
              </>
            ) : mascotState === 'happy' ? (
              <>
                <path d="M 28 40 Q 31 34 34 40" stroke={lightColor} strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 46 40 Q 49 34 52 40" stroke={lightColor} strokeWidth="2.5" strokeLinecap="round" />
              </>
            ) : (
              <>
                <circle cx="31" cy="38" r="3" fill={lightColor} />
                <circle cx="49" cy="38" r="3" fill={lightColor} />
              </>
            )}
          </g>

          {/* Mouth */}
          <path d={mouthPath} stroke="#1C1917" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          
          {/* Floating Base shadow */}
          <ellipse cx="40" cy="72" rx="15" ry="3" fill="#E7E5E4" />
        </svg>
      </div>
    </div>
  );
};
