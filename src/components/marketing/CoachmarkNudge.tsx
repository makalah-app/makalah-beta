"use client";

import React from "react";
import clsx from "clsx";

type CoachmarkNudgeProps = {
  label?: string;
  className?: string;
  onClick?: () => void;
};

/**
 * CoachmarkNudge
 * - Bubble teks kecil dengan panah lengkung merah yang menunjuk ke bawah-kiri.
 * - Dibuat sangat ringan (SVG inline) dan aman untuk theme gelap/terang.
 * - Default: muncul di pojok kanan-atas parent bertingkat `relative`.
 */
export default function CoachmarkNudge({ label = "Klik untuk baca", className, onClick }: CoachmarkNudgeProps) {
  return (
    <div
      className={clsx(
        // Diposisikan tepat di atas tengah target (badge)
        "pointer-events-none absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2 z-20",
        className
      )}
      aria-hidden
    >
      <div className="flex flex-col items-center gap-1">
        {/* Bubble teks */}
        <button
          type="button"
          onClick={onClick}
          className="pointer-events-auto select-none rounded-full px-3 py-1 text-xs font-semibold shadow-md border border-border bg-card text-card-foreground hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          {label}
        </button>

        {/* Panah vertikal sedikit melengkung ke bawah, tepat ke tengah badge */}
        <svg
          className="w-7 h-8 text-red-600"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path d="M12 2 C 12 8, 12 12, 12 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M7 14 L12 22 L17 14" fill="currentColor" />
        </svg>
      </div>
    </div>
  );
}
