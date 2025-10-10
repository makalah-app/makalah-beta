"use client";

import React from "react";

export function HeroResearchGrid() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      <svg className="w-full h-full" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          {/* Grid pattern */}
          <pattern id="rg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="var(--muted-foreground)" strokeOpacity="0.15" strokeWidth="1" />
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

          {/* Radial aurora fills (warm + cool) */}
          <radialGradient id="rg-aurora-warm-1" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0) rotate(0) scale(1 1)">
            <stop offset="0%" stopColor="rgba(255,138,0,0.32)" />
            <stop offset="70%" stopColor="rgba(255,138,0,0)" />
          </radialGradient>
          <radialGradient id="rg-aurora-warm-2" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(255,138,0,0.20)" />
            <stop offset="75%" stopColor="rgba(255,138,0,0)" />
          </radialGradient>
          <radialGradient id="rg-aurora-cool" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(56,189,248,0.18)" />
            <stop offset="75%" stopColor="rgba(56,189,248,0)" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        <rect x="0" y="0" width="1440" height="720" fill="url(#rg-grid)" />

        {/* Full-canvas aurora layers (blurred, no hard edges) */}
        <g filter="url(#rg-blur-aurora)">
          <circle cx="220" cy="140" r="600" fill="url(#rg-aurora-warm-1)" />
          <circle cx="1240" cy="160" r="500" fill="url(#rg-aurora-warm-2)" />
          <circle cx="1120" cy="560" r="600" fill="url(#rg-aurora-cool)" />
        </g>

        {/* Soft axes (very subtle) */}
        <g stroke="var(--muted-foreground)" strokeOpacity="0.18">
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
          strokeOpacity="0.16"
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
      {/* Subtle scrim to ensure text contrast on bright hues */}
      <div className="absolute inset-0 bg-black/4" />
    </div>
  );
}

export default HeroResearchGrid;
