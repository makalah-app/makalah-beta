"use client";

import { cn } from "@/lib/utils";
import { Plus, Send, MousePointer2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import TypewriterText from "./TypewriterText";

export default function ChatInputHeroMock() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [phase, setPhase] = useState<
    "placeholder" | "typing" | "hold" | "cursorMove" | "hover" | "click" | "reset" | "return"
  >("placeholder");
  const timers = useRef<number[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<HTMLDivElement | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; scale: number; transition: string }>({ x: 0, y: 0, scale: 1, transition: "none" });

  const MESSAGE =
    "Bantuin gue bikin paper. Tapi belum ada topik spesifik. Cuma gagasan kasar nggak apa-apa, kan? Gimana kalau kita brainstorming dulu?";

  // visibility + reduced-motion guards
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);

    const el = rootRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries[0]?.isIntersecting ?? true;
        setInView(vis);
      },
      { threshold: 0.5 }
    );
    if (el) io.observe(el);

    return () => {
      mq.removeEventListener?.("change", onChange);
      io.disconnect();
    };
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // simple phase machine loop
  useEffect(() => {
    if (!inView || reduced) {
      clearTimers();
      setPhase("placeholder");
      return;
    }

    clearTimers();
    const schedule = (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    if (phase === "placeholder") {
      schedule(() => setPhase("typing"), 4000); // placeholder lebih lama untuk memberi waktu
    } else if (phase === "hold") {
      schedule(() => setPhase("cursorMove"), 900);
    } else if (phase === "cursorMove") {
      schedule(() => setPhase("hover"), 800);
    } else if (phase === "hover") {
      schedule(() => setPhase("click"), 600); // tahan di atas send lebih lama
    } else if (phase === "click") {
      schedule(() => setPhase("reset"), 200);
    } else if (phase === "reset") {
      schedule(() => setPhase("return"), 350); // teks fade-out, lalu kursor kembali ke tengah
    } else if (phase === "return") {
      schedule(() => setPhase("placeholder"), 800); // anim balik 800ms, lalu placeholder
    }

    return () => clearTimers();
  }, [phase, inView, reduced]);

  // recalc cursor coordinates and apply transforms per phase
  useEffect(() => {
    if (reduced) return;
    const cont = containerRef.current;
    if (!cont) return;
    const cbox = cont.getBoundingClientRect();

    // start: center of input box (lebih natural dari tengah)
    const startX = cbox.width * 0.5;
    const startY = cbox.height * 0.5;

    // end: center of send icon
    let endX = startX;
    let endY = startY;
    const sbox = sendRef.current?.getBoundingClientRect();
    if (sbox) {
      endX = sbox.left - cbox.left + sbox.width * 0.5;
      endY = sbox.top - cbox.top + sbox.height * 0.5;
    }

    if (phase === "placeholder" || phase === "typing" || phase === "hold") {
      setCursor({ x: startX, y: startY, scale: 1, transition: "none" });
    } else if (phase === "cursorMove") {
      setCursor({ x: startX, y: startY, scale: 1, transition: "none" });
      // next frame to enable transition
      requestAnimationFrame(() => {
        setCursor({ x: endX, y: endY, scale: 1, transition: "transform 800ms ease-in-out" });
      });
    } else if (phase === "hover") {
      setCursor({ x: endX, y: endY, scale: 1, transition: "transform 150ms ease-out" });
    } else if (phase === "click") {
      setCursor({ x: endX, y: endY, scale: 0.94, transition: "transform 200ms ease-out" });
    } else if (phase === "reset") {
      // keep at end while text fades out
      setCursor({ x: endX, y: endY, scale: 1, transition: "none" });
    } else if (phase === "return") {
      // animate back to center
      setCursor({ x: endX, y: endY, scale: 1, transition: "none" });
      requestAnimationFrame(() => {
        setCursor({ x: startX, y: startY, scale: 1, transition: "transform 800ms ease-in-out" });
      });
    }
  }, [phase, reduced]);

  // re-evaluate on resize
  useEffect(() => {
    const onResize = () => {
      if (phase === "cursorMove" || phase === "click") {
        // re-trigger to recompute positions
        setPhase((p) => (p === "cursorMove" ? "cursorMove" : "click"));
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase]);
  return (
    <div
      className={cn(
        "pointer-events-none select-none hidden md:block",
        "w-full max-w-4xl mx-auto"
      )}
      aria-hidden
    >
      <div className="rounded border border-white/10 bg-[#0f0f0f] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7),0_8px_24px_-8px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* Browser bar */}
        <div ref={rootRef} className="h-7 md:h-8 bg-[#2b2b2b] border-b border-white/10 flex items-center px-3 gap-2 rounded-t-[3px]">
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f56' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#5e5e5e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
        </div>
        {/* Chat input area (single large box) */}
        <div ref={containerRef} className="relative rounded-b-[3px] border border-white/10 bg-[#161616] h-32 md:h-36">
          {/* Placeholder shimmer (Phase: placeholder/reset or reduced-motion) */}
          {((phase === "placeholder" || phase === "reset" || phase === "return") || reduced) && (
            <div
              className="absolute left-4 right-12 top-3 md:left-5 md:right-14 md:top-4 text-left"
              style={{ fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace' }}
            >
              <span className="hero-text-shimmer text-base md:text-lg font-medium tracking-wide">Ketik obrolan</span>
            </div>
          )}

          {/* Typewriter (Phase: typing/hold) */}
          {!reduced && (phase === "typing" || phase === "hold" || phase === "cursorMove" || phase === "hover" || phase === "click" || phase === "reset") && (
            <div
              className="absolute left-4 right-12 top-3 md:left-5 md:right-14 md:top-4 text-left"
              style={{ fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace' }}
            >
              {phase === "typing" ? (
                <TypewriterText
                  text={MESSAGE}
                  active={inView}
                  startDelay={0}
                  minMsPerChar={35}
                  maxMsPerChar={58}
                  punctuationFactor={1.8}
                  showCaret
                  onDone={() => setPhase("hold")}
                  className="text-base md:text-lg font-medium tracking-wide"
                />
              ) : (
                <span className={
                  "text-white/80 text-base md:text-lg font-medium tracking-wide transition-opacity duration-300 " +
                  (phase === "reset" ? "opacity-0" : "opacity-100")
                }>
                  {MESSAGE}
                </span>
              )}
            </div>
          )}
          {/* Corner icons */}
          <div className="absolute left-4 bottom-3 md:left-5 md:bottom-4 text-white/65">
            <Plus className="w-6 h-6" />
          </div>
          <div
            ref={sendRef}
            className={
              "absolute right-4 bottom-3 md:right-5 md:bottom-4 rounded border border-white/10 px-1.5 py-1 transition-all " +
              ((phase === "hover" || phase === "click") ? "bg-accent/40 text-foreground scale-[1.03]" : "text-white/65")
            }
          >
            <Send className="w-6 h-6" />
          </div>

          {/* Cursor overlay */}
          {!reduced && (
            <div
              className="absolute top-0 left-0 pointer-events-none"
              style={{ transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${cursor.scale})`, transition: cursor.transition }}
            >
              <MousePointer2 className="w-6 h-6 text-primary drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
