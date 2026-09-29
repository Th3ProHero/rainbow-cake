/**
 * Rainbow Cake GO — SVG Logo Component
 * Wordmark with a layered cake slice icon
 */

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  showText?: boolean;
}

const sizes = {
  sm: { icon: 24, text: "text-lg" },
  md: { icon: 32, text: "text-2xl" },
  lg: { icon: 48, text: "text-4xl" },
};

export function Logo({
  className,
  size = "md",
  showIcon = true,
  showText = true,
}: LogoProps) {
  const s = sizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && (
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Cake slice base */}
          <path
            d="M8 38L24 6L40 38H8Z"
            fill="#FFE3EC"
            stroke="#D12F6A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Layer lines */}
          <line x1="12" y1="28" x2="36" y2="28" stroke="#F27BA3" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="33" x2="34" y2="33" stroke="#D12F6A" strokeWidth="2" strokeLinecap="round" />
          <line x1="10" y1="23" x2="38" y2="23" stroke="#F27BA3" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          {/* Cherry on top */}
          <circle cx="24" cy="8" r="4" fill="#D12F6A" />
          <path
            d="M24 4C26 2 28 3 27 5"
            stroke="#B82458"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Frosting drip */}
          <path
            d="M16 18C18 20 20 19 22 18C24 17 26 19 28 18C30 17 32 19 34 18"
            stroke="#F27BA3"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      )}
      {showText && (
        <span
          className={cn(
            "font-display font-bold tracking-tight text-ink",
            s.text
          )}
        >
          Rainbow Cake{" "}
          <span className="text-strawberry">GO</span>
        </span>
      )}
    </div>
  );
}
