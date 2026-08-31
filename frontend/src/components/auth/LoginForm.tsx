import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useMousePosition } from '../../hooks/useMousePosition';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { AnimatedBackground } from './AnimatedBackground';
import { SecurityGuardian } from './SecurityGuardian';
import type { GuardianState } from './SecurityGuardian';
import { VirtualKeyboard } from './VirtualKeyboard';
import { LaserBeam } from './LaserBeam';
import { Mail, Lock, AlertCircle, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { AccuraLogo } from '../ui/AccuraLogo';
import './LoginExperience.css';

// ── Cinematic entrance phases ──────────────────────────────────
type EntrancePhase = 'init' | 'bg' | 'geometry' | 'brand' | 'guardian' | 'eyes' | 'ready';

const PHASE_TIMING: Record<EntrancePhase, number> = {
  init: 0,
  bg: 50,
  geometry: 300,
  brand: 600,
  guardian: 900,
  eyes: 1200,
  ready: 1500,
};

const ALPHA_KEYS = new Set('abcdefghijklmnopqrstuvwxyz'.split(''));

export const LoginForm: React.FC = () => {
  // ── Auth (untouched) ───────────────────────────────────────
  const { login, error } = useAuth();
  const [email, setEmail] = useState('admin@lr-billing.com');
  const [password, setPassword] = useState('password');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ── Visual state ───────────────────────────────────────────
  const [phase, setPhase] = useState<EntrancePhase>('init');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [guardianState, setGuardianState] = useState<GuardianState>('idle');
  const [showSuccess, setShowSuccess] = useState(false);

  // ── Refs ───────────────────────────────────────────────────
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const activeKeyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);
  const emitterRef = useRef<SVGCircleElement | null>(null);
  const keyRectsRef = useRef<Map<string, DOMRect>>(new Map());

  // ── Laser beam positions ───────────────────────────────────
  const [laserFrom, setLaserFrom] = useState({ x: 0, y: 0 });
  const [laserTo, setLaserTo] = useState({ x: 0, y: 0 });
  const [laserFiring, setLaserFiring] = useState(false);

  // ── Hooks ──────────────────────────────────────────────────
  const reducedMotion = useReducedMotion();
  const mouse = useMousePosition(!reducedMotion);

  // ── Cinematic entrance ─────────────────────────────────────
  useEffect(() => {
    if (reducedMotion) {
      setPhase('ready');
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const phases: EntrancePhase[] = ['bg', 'geometry', 'brand', 'guardian', 'eyes', 'ready'];

    phases.forEach((p) => {
      timers.push(setTimeout(() => setPhase(p), PHASE_TIMING[p]));
    });

    return () => timers.forEach(clearTimeout);
  }, [reducedMotion]);

  // ── Guardian state derivation ──────────────────────────────
  useEffect(() => {
    if (guardianState === 'success' || guardianState === 'denied') return;

    if (focusedField === 'password') {
      setGuardianState('secure');
    } else if (focusedField === 'email') {
      setGuardianState('watching');
    } else {
      setGuardianState('idle');
    }
  }, [focusedField, guardianState]);

  // ── Key capture for visual feedback only ───────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (reducedMotion) return;

      const key = e.key.toLowerCase();
      if (!ALPHA_KEYS.has(key)) return;

      // Set active key for visual highlight
      setActiveKey(key);
      setIsTyping(true);

      // Clear previous timers
      if (activeKeyTimeoutRef.current) clearTimeout(activeKeyTimeoutRef.current);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      // Fire laser
      const emitterEl = emitterRef.current;
      if (emitterEl) {
        const emitterRect = emitterEl.getBoundingClientRect();
        const fromX = emitterRect.left + emitterRect.width / 2;
        const fromY = emitterRect.top + emitterRect.height / 2;
        setLaserFrom({ x: fromX, y: fromY });

        // Find the target key position
        const keyRect = keyRectsRef.current.get(key.toUpperCase());
        if (keyRect) {
          setLaserTo({
            x: keyRect.left + keyRect.width / 2,
            y: keyRect.top + keyRect.height / 2,
          });
          setLaserFiring(true);
          setTimeout(() => setLaserFiring(false), 180);
        }
      }

      // Clear active key after animation
      activeKeyTimeoutRef.current = setTimeout(() => {
        setActiveKey(null);
      }, 180);

      // Hide keyboard after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 2000);
    },
    [reducedMotion],
  );

  // ── Keyboard ref map callback ──────────────────────────────
  const handleKeyRefMap = useCallback((map: Map<string, DOMRect>) => {
    keyRectsRef.current = map;
  }, []);

  // ── Emitter ref callback ───────────────────────────────────
  const handleEmitterRef = useCallback((el: SVGCircleElement | null) => {
    emitterRef.current = el;
  }, []);

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email, password);
      setGuardianState('success');
      setShowSuccess(true);
    } catch {
      // Error is handled by AuthContext
      setGuardianState('denied');
      setTimeout(() => {
        setGuardianState(focusedField === 'password' ? 'secure' : focusedField === 'email' ? 'watching' : 'idle');
      }, 800);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Phase helpers ──────────────────────────────────────────
  const phaseIndex = ['init', 'bg', 'geometry', 'brand', 'guardian', 'eyes', 'ready'].indexOf(phase);
  const bgVisible = phaseIndex >= 1;
  const geometryVisible = phaseIndex >= 2;
  const brandVisible = phaseIndex >= 3;
  const guardianVisible = phaseIndex >= 4;
  const eyesActive = phaseIndex >= 5;
  const formVisible = phaseIndex >= 6;

  return (
    <div className="login-experience">
      {/* LAYER 1: Animated background */}
      <AnimatedBackground
        visible={bgVisible}
        geometryVisible={geometryVisible}
        mouseX={mouse.x}
        mouseY={mouse.y}
        reducedMotion={reducedMotion}
      />

      {/* Main composition container */}
      <div className="login-composition">
        {/* LAYER 2: Guardian */}
        <div
          className="guardian-panel"
          style={{
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <SecurityGuardian
            visible={guardianVisible}
            eyesActive={eyesActive}
            state={guardianState}
            focusedField={focusedField}
            mouseX={mouse.x}
            mouseY={mouse.y}
            activeKey={activeKey}
            reducedMotion={reducedMotion}
            onEmitterRef={handleEmitterRef}
          />

          {/* Virtual keyboard below guardian */}
          <VirtualKeyboard
            visible={isTyping && !reducedMotion}
            activeKey={activeKey}
            onKeyRefMap={handleKeyRefMap}
          />
        </div>

        {/* LAYER 3: Login form */}
        <div
          className={`login-form-container ${formVisible ? '--visible' : ''}`}
          style={{ width: '100%', maxWidth: '380px' }}
        >
          {/* Brand */}
          <div
            className={`login-brand ${brandVisible ? '--visible' : ''}`}
            style={{ marginBottom: '36px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
              <AccuraLogo variant="symbol" size="lg" />
              <div>
                <h1 className="login-brand__title">ACCURA</h1>
                <p className="login-brand__subtitle">Financial Operations Platform</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Error message */}
            {error && (
              <div className="login-error" role="alert" aria-live="polite">
                <AlertCircle className="login-error__icon" size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div className="login-input-group">
              <label htmlFor="login-email" className="login-input-label">
                Account Email
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={handleKeyDown}
                  placeholder="operator@company.com"
                  className="login-input"
                />
                <Mail className="login-input-icon" size={16} />
              </div>
            </div>

            {/* Password */}
            <div className="login-input-group">
              <label htmlFor="login-password" className="login-input-label">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••"
                  className={`login-input --secure`}
                />
                <Lock className="login-input-icon" size={16} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="login-submit"
            >
              {isSubmitting ? (
                <>
                  <div className="login-submit__spinner" />
                  <span>Authenticating…</span>
                </>
              ) : (
                <>
                  <Shield size={15} />
                  <span>Secure Access</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            {/* Footer */}
            <div className="login-footer" style={{ marginTop: '8px', paddingTop: '16px', borderTop: '1px solid var(--login-border)' }}>
              <span>Authoritative Accounting Engine</span>
              <span style={{ margin: '0 8px', opacity: 0.4 }}>·</span>
              <span>Multi-Organization Isolation</span>
            </div>
          </form>
        </div>
      </div>

      {/* Laser beam overlay */}
      {!reducedMotion && (
        <LaserBeam
          firing={laserFiring}
          fromX={laserFrom.x}
          fromY={laserFrom.y}
          toX={laserTo.x}
          toY={laserTo.y}
        />
      )}

      {/* Success pulse */}
      {showSuccess && <div className="login-success-pulse" />}
    </div>
  );
};
