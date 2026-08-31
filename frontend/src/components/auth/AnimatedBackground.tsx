import React from 'react';

interface AnimatedBackgroundProps {
  visible: boolean;
  geometryVisible: boolean;
  mouseX: number;
  mouseY: number;
  reducedMotion: boolean;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  visible,
  geometryVisible,
  mouseX,
  mouseY,
  reducedMotion,
}) => {
  const parallaxX = reducedMotion ? 0 : mouseX * 6;
  const parallaxY = reducedMotion ? 0 : mouseY * 4;
  const lightX = 50 + mouseX * 15;
  const lightY = 40 + mouseY * 10;

  return (
    <div className={`login-bg ${visible ? '--visible' : ''}`}>
      {/* Gradient lighting layer - follows mouse */}
      <div
        className="login-bg__gradient"
        style={
          reducedMotion
            ? undefined
            : {
                background: `
                  radial-gradient(ellipse 50% 40% at ${lightX}% ${lightY}%, rgba(212, 244, 66, 0.04) 0%, transparent 50%),
                  radial-gradient(ellipse 80% 60% at 20% 30%, rgba(237, 234, 223, 0.9) 0%, transparent 70%),
                  radial-gradient(ellipse 70% 60% at 60% 80%, rgba(139, 145, 120, 0.06) 0%, transparent 60%)
                `,
              }
        }
      />

      {/* SVG geometry layer */}
      {geometryVisible && (
        <svg
          className="login-bg__svg"
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          role="presentation"
          aria-hidden="true"
          style={
            reducedMotion
              ? undefined
              : { transform: `translate(${parallaxX}px, ${parallaxY}px)` }
          }
        >
          {/* Architectural grid lines */}
          <g opacity="0.5">
            <line className="login-bg__line --animated" x1="120" y1="0" x2="120" y2="900" />
            <line className="login-bg__line --animated" x1="360" y1="0" x2="360" y2="900" />
            <line className="login-bg__line --animated-reverse" x1="720" y1="0" x2="720" y2="900" />
            <line className="login-bg__line --animated" x1="1080" y1="0" x2="1080" y2="900" />
            <line className="login-bg__line --animated-reverse" x1="1320" y1="0" x2="1320" y2="900" />

            <line className="login-bg__line --animated-reverse" x1="0" y1="180" x2="1440" y2="180" />
            <line className="login-bg__line --animated" x1="0" y1="450" x2="1440" y2="450" />
            <line className="login-bg__line --animated-reverse" x1="0" y1="720" x2="1440" y2="720" />
          </g>

          {/* Flowing curved paths */}
          <path
            className="login-bg__curve"
            d="M0 400 C200 350, 400 500, 600 380 S1000 450, 1200 350 S1440 420, 1440 400"
          />
          <path
            className="login-bg__curve"
            d="M0 600 C300 550, 500 650, 800 580 S1100 620, 1440 560"
            style={{ animationDelay: '-15s' }}
          />
          <path
            className="login-bg__curve"
            d="M0 200 C180 180, 400 250, 700 190 S1100 240, 1440 200"
            style={{ animationDelay: '-30s' }}
          />

          {/* Floating dots / data points */}
          <circle className="login-bg__dot --orbit-1" cx="200" cy="250" r="2" />
          <circle className="login-bg__dot --orbit-2" cx="450" cy="150" r="1.5" />
          <circle className="login-bg__dot --orbit-3" cx="680" cy="350" r="1.8" />
          <circle className="login-bg__dot --orbit-1" cx="900" cy="200" r="1.2" style={{ animationDelay: '-5s' }} />
          <circle className="login-bg__dot --orbit-2" cx="1100" cy="450" r="2" style={{ animationDelay: '-10s' }} />
          <circle className="login-bg__dot --orbit-3" cx="350" cy="650" r="1.5" style={{ animationDelay: '-7s' }} />
          <circle className="login-bg__dot --orbit-1" cx="750" cy="700" r="1.8" style={{ animationDelay: '-12s' }} />
          <circle className="login-bg__dot --orbit-2" cx="1250" cy="300" r="1.3" style={{ animationDelay: '-3s' }} />
          <circle className="login-bg__dot --orbit-3" cx="550" cy="500" r="2.2" style={{ animationDelay: '-18s' }} />
          <circle className="login-bg__dot --orbit-1" cx="1000" cy="650" r="1.6" style={{ animationDelay: '-8s' }} />
          <circle className="login-bg__dot --orbit-2" cx="150" cy="500" r="1.4" style={{ animationDelay: '-14s' }} />
          <circle className="login-bg__dot --orbit-3" cx="1350" cy="600" r="1.7" style={{ animationDelay: '-20s' }} />

          {/* Financial graph traces */}
          <polyline
            className="login-bg__graph"
            points="100,500 200,480 300,510 400,460 500,490 600,440 700,470 800,420 900,450 1000,410 1100,440 1200,400 1300,430 1440,390"
          />
          <polyline
            className="login-bg__graph"
            points="0,680 150,660 300,690 450,650 600,670 750,640 900,660 1050,630 1200,650 1350,620 1440,640"
            style={{ animationDelay: '-10s' }}
          />

          {/* Orbital arcs */}
          <circle className="login-bg__arc" cx="720" cy="450" r="280" />
          <circle className="login-bg__arc" cx="720" cy="450" r="350" style={{ animationDelay: '-30s', animationDirection: 'reverse' }} />

          {/* Invoice silhouettes */}
          <g className="login-bg__invoice" transform="translate(180, 100)">
            <rect x="0" y="0" width="60" height="80" rx="3" />
            <line x1="8" y1="15" x2="52" y2="15" />
            <line x1="8" y1="25" x2="40" y2="25" />
            <line x1="8" y1="35" x2="48" y2="35" />
            <line x1="8" y1="50" x2="30" y2="50" />
            <line x1="35" y1="65" x2="52" y2="65" />
          </g>

          <g className="login-bg__invoice" transform="translate(1150, 620)" style={{ animationDelay: '-15s' }}>
            <rect x="0" y="0" width="50" height="65" rx="2" />
            <line x1="6" y1="12" x2="44" y2="12" />
            <line x1="6" y1="20" x2="35" y2="20" />
            <line x1="6" y1="28" x2="40" y2="28" />
            <line x1="28" y1="52" x2="44" y2="52" />
          </g>

          {/* Precision rings */}
          <circle cx="1300" cy="150" r="40" fill="none" stroke="var(--login-sage)" strokeWidth="0.3" opacity="0.06">
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 1300 150"
                to="360 1300 150"
                dur="60s"
                repeatCount="indefinite"
              />
            )}
          </circle>
          <circle cx="1300" cy="150" r="50" fill="none" stroke="var(--login-olive)" strokeWidth="0.2" opacity="0.04" strokeDasharray="4 8">
            {!reducedMotion && (
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="360 1300 150"
                to="0 1300 150"
                dur="80s"
                repeatCount="indefinite"
              />
            )}
          </circle>

          {/* Small status indicator dots */}
          <circle cx="140" cy="780" r="3" fill="var(--login-lime)" opacity="0.1" />
          <circle cx="155" cy="780" r="3" fill="var(--login-sage)" opacity="0.08" />
          <circle cx="170" cy="780" r="3" fill="var(--login-sage)" opacity="0.06" />
        </svg>
      )}
    </div>
  );
};
