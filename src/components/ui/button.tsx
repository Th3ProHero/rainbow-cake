import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-strawberry focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-strawberry text-white hover:bg-strawberry-hover active:scale-[0.98]",
        secondary:
          "bg-cotton text-strawberry hover:bg-[#ffd6e2] active:scale-[0.98]",
        outline:
          "border border-border bg-white text-ink hover:bg-meringue hover:border-strawberry active:scale-[0.98]",
        ghost:
          "text-ink-secondary hover:bg-cotton/50 hover:text-ink",
        destructive:
          "bg-status-cancelled-bg text-status-cancelled-fg hover:bg-[#f5d0d0] active:scale-[0.98]",
        link:
          "text-strawberry underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-sm rounded-[12px]",
        sm: "h-9 px-3.5 py-2 text-xs rounded-[10px]",
        lg: "h-12 px-8 py-3 text-base rounded-[14px]",
        icon: "h-10 w-10 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
