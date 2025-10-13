"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TypewriterTextProps {
  text: string;
  active?: boolean;
  startDelay?: number;
  minMsPerChar?: number;
  maxMsPerChar?: number;
  punctuationFactor?: number;
  showCaret?: boolean;
  className?: string;
  onDone?: () => void;
}

export default function TypewriterText({
  text,
  active = true,
  startDelay = 0,
  minMsPerChar = 28,
  maxMsPerChar = 40,
  punctuationFactor = 1.8,
  showCaret = true,
  className,
  onDone,
}: TypewriterTextProps) {
  const [typed, setTyped] = useState("");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    // reset any existing timers
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setTyped("");

    if (!active) return;

    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    const run = () => {
      let i = 0;
      const tick = () => {
        if (i <= text.length) {
          setTyped(text.slice(0, i));
          i += 1;
          if (i <= text.length) {
            const ch = text[i - 1] || "";
            const punct = ",.;:?!".includes(ch) ? punctuationFactor : 1;
            const base = Math.floor(
              minMsPerChar + Math.random() * Math.max(1, maxMsPerChar - minMsPerChar)
            );
            schedule(tick, Math.max(10, Math.floor(base * punct)));
          } else {
            onDone?.();
          }
        }
      };
      tick();
    };

    schedule(run, startDelay);
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
    };
  }, [text, active, startDelay, minMsPerChar, maxMsPerChar, punctuationFactor, onDone]);

  return (
    <span className={cn("text-white/80", className)}>
      {typed}
      {showCaret && active && (
        <span className="inline-block align-baseline ml-0.5 w-px h-[1.1em] bg-white/80 hero-caret-blink" />
      )}
    </span>
  );
}

