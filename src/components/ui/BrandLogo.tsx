"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoVariant = "color" | "mono";
type BrandLogoSize = "sm" | "md" | "lg";

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
};

const DIMENSIONS: Record<BrandLogoSize, { w: number; h: number }> = {
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
      className={cn("rounded-[3px]", className)}
      priority={priority}
    />
  );
}

export default BrandLogo;

