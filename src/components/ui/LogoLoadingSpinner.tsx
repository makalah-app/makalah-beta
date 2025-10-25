import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoLoadingSpinnerProps {
  className?: string;
}

export function LogoLoadingSpinner({ className }: LogoLoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "relative h-12 w-12",
        "flex items-center justify-center",
        "motion-safe:animate-logo-pulse",
        className
      )}
      aria-hidden="true"
    >
      <Image
        src="/logo/makalah_logo_500x500.png"
        alt="Makalah logo animasi frame utama"
        width={32}
        height={32}
        className="logo-spinner-frame animate-logo-primary"
        priority
      />
      <Image
        src="/logo/makalah_logo_500x500_grey.png"
        alt="Makalah logo animasi frame sekunder"
        width={32}
        height={32}
        className="logo-spinner-frame animate-logo-secondary"
        priority
      />
    </div>
  );
}

export default LogoLoadingSpinner;
