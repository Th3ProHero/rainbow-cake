import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-[12px] border border-border bg-white px-4 py-2.5 text-sm text-ink",
          "placeholder:text-ink-secondary/60",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strawberry/30 focus-visible:border-strawberry",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "transition-colors duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
