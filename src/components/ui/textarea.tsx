import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-[12px] border border-border bg-white px-4 py-3 text-sm text-ink",
        "placeholder:text-ink-secondary/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strawberry/30 focus-visible:border-strawberry",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-colors duration-200 resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
