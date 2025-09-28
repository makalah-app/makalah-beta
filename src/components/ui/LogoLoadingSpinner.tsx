"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoLoadingSpinnerProps {
  className?: string;
  interval?: number;
}

const frames = [
  {
    src: "/logo/makalah_logo_48x48.png",
    alt: "Makalah logo frame 1",
  },
  {
    src: "/logo/makalah_logo_48x48_grey.png",
    alt: "Makalah logo frame 2",
  },
];

export function LogoLoadingSpinner({ className, interval = 600 }: LogoLoadingSpinnerProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % frames.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval]);

  return (
    <div
      className={cn(
        "relative h-12 w-12",
        "flex items-center justify-center",
        "motion-safe:animate-[pulse_1.8s_ease-in-out_infinite]",
        className
      )}
      aria-hidden="true"
    >
      {frames.map((frame, index) => (
        <Image
          key={frame.src}
          src={frame.src}
          alt={frame.alt}
          width={48}
          height={48}
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            index === activeIndex ? "opacity-100" : "opacity-0"
          )}
          priority
        />
      ))}
    </div>
  );
}

export default LogoLoadingSpinner;
