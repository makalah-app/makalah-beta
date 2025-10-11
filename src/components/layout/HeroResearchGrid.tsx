"use client";

import React from "react";

export function HeroResearchGrid() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          {/* Grid pattern */}
          <pattern id="rg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.08" strokeWidth="1" />
          </pattern>

          {/* Soft blur filters for abstract areas */}
          <filter id="rg-blur-1" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="rg-blur-2" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          <filter id="rg-blur-3" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="26" />
          </filter>

          {/* Large aurora blur for full-canvas warmth */}
          <filter id="rg-blur-aurora" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="90" />
          </filter>

          {/* Gradients based on brand color */}
          <linearGradient id="rg-grad-primary" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="rg-grad-cool" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(56,189,248,0.16)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </linearGradient>

          {/* Base wash gradient for vivid background */}
          <linearGradient id="rg-base-wash" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,138,0,0.45)" />
            <stop offset="55%" stopColor="rgba(124,58,237,0.28)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0.35)" />
          </linearGradient>

          {/* Radial aurora fills (warm + cool) */}
          <radialGradient id="rg-aurora-warm-1">
            <stop offset="0%" stopColor="rgba(255,138,0,0.65)" />
            <stop offset="100%" stopColor="rgba(255,138,0,0)" />
          </radialGradient>
          <radialGradient id="rg-aurora-warm-2">
            <stop offset="0%" stopColor="rgba(255,138,0,0.50)" />
            <stop offset="100%" stopColor="rgba(255,138,0,0)" />
          </radialGradient>
          <radialGradient id="rg-aurora-cool">
            <stop offset="0%" stopColor="rgba(56,189,248,0.50)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </radialGradient>
          <radialGradient id="rg-aurora-cool-2">
            <stop offset="0%" stopColor="rgba(56,189,248,0.20)" />
            <stop offset="100%" stopColor="rgba(56,189,248,0)" />
          </radialGradient>
          <radialGradient id="rg-aurora-deepblue">
            <stop offset="0%" stopColor="rgba(37,99,235,0.40)" />
            <stop offset="100%" stopColor="rgba(37,99,235,0)" />
          </radialGradient>
        </defs>

        {/* Base wash behind grid */}
        <rect x="0" y="0" width="1440" height="720" fill="url(#rg-base-wash)" style={{ mixBlendMode: 'screen' }} />

        {/* Background grid */}
        <rect x="0" y="0" width="1440" height="720" fill="url(#rg-grid)" />

        {/* Full-canvas aurora layers (max vivid) */}
        <g filter="url(#rg-blur-aurora)" style={{ mixBlendMode: 'screen' }}>
          <circle cx="220" cy="140" r="600" fill="url(#rg-aurora-warm-1)" />
          <circle cx="1240" cy="160" r="500" fill="url(#rg-aurora-warm-2)" />
          <circle cx="1120" cy="560" r="680" fill="url(#rg-aurora-cool)" />
          <circle cx="960" cy="260" r="420" fill="url(#rg-aurora-cool-2)" />
          <circle cx="380" cy="520" r="480" fill="url(#rg-aurora-deepblue)" />
          {/* central warm boost removed for contrast */}
        </g>

        {/* Soft axes (very subtle) */}
        <g stroke="var(--muted-foreground)" strokeOpacity="0.10">
          <line x1="0" y1="540" x2="1440" y2="540" />
          <line x1="240" y1="0" x2="240" y2="720" />
        </g>

        {/* Abstract research areas (no hard edges) */}
        <path
          d="M0,520 C240,420 480,460 720,420 C960,380 1200,420 1440,400 L1440,720 L0,720 Z"
          fill="url(#rg-grad-primary)"
          filter="url(#rg-blur-1)"
          opacity="0.9"
        />
        <path
          d="M0,620 C200,560 480,600 700,560 C980,500 1200,560 1440,540 L1440,720 L0,720 Z"
          fill="url(#rg-grad-cool)"
          filter="url(#rg-blur-3)"
          opacity="0.9"
        />

        {/* Gentle trend curve glow over grid */}
        <path
          d="M0,460 C220,390 480,430 720,410 C960,390 1200,450 1440,430"
          fill="none"
          stroke="var(--primary)"
          strokeOpacity="0.12"
          strokeWidth="24"
          filter="url(#rg-blur-2)"
        />

        {/* Sparse scatter points */}
        <g fill="var(--primary)" fillOpacity="0.22">
          <circle cx="180" cy="500" r="3" />
          <circle cx="340" cy="455" r="2.5" />
          <circle cx="520" cy="470" r="2.5" />
          <circle cx="690" cy="440" r="3" />
          <circle cx="850" cy="430" r="2.5" />
          <circle cx="1010" cy="445" r="2.5" />
          <circle cx="1180" cy="420" r="3" />
        </g>
      </svg>
      {/* No scrim for maximum vividness */}
    </div>
  );
}

export default HeroResearchGrid;
