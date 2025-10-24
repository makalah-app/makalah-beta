"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoVariant = "color" | "mono" | "white";
type BrandLogoSize = "xs" |"sm" | "md" | "lg";

interface BrandLogoProps {
  variant?: BrandLogoVariant;
  size?: BrandLogoSize;
  className?: string;
  alt?: string;
  priority?: boolean;
}

const SRC: Record<BrandLogoVariant, string> = {
  color: "/logo/makalah_logo_500x500.png",
  mono: "/logo/makalah_logo_500x500_grey.png",
  white: "/logo/official_logo_white.svg",
};

const DIMENSIONS: Record<BrandLogoSize, { w: number; h: number }> = {
  xs: { w: 24, h: 24 },
  sm: { w: 32, h: 32 },
  md: { w: 40, h: 40 },
  lg: { w: 48, h: 48 },
};

export function BrandLogo({
  variant = "color",
  size = "md",
  className,
  alt = "Makalah AI - Logo",
  priority = false,
}: BrandLogoProps) {
  const { w, h } = DIMENSIONS[size];
  const src = SRC[variant];

  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      className={cn("app-logo", className)}
      priority={priority}
    />
  );
}

export default BrandLogo;
