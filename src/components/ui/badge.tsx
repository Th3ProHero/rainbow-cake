import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[999px] px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-cotton text-strawberry",
        pending: "bg-status-pending-bg text-status-pending-fg",
        inTransit: "bg-status-transit-bg text-status-transit-fg",
        inWarehouse: "bg-status-warehouse-bg text-status-warehouse-fg",
        partiallyDelivered: "bg-status-partial-bg text-status-partial-fg",
        delivered: "bg-status-delivered-bg text-status-delivered-fg",
        cancelled: "bg-status-cancelled-bg text-status-cancelled-fg",
        unpaid: "bg-payment-none-bg text-payment-none-fg",
        partialPayment: "bg-payment-partial-bg text-payment-partial-fg",
        paid: "bg-payment-paid-bg text-payment-paid-fg",
        offer: "bg-strawberry text-white",
        outOfStock: "bg-status-cancelled-bg text-status-cancelled-fg",
        onDemand: "bg-status-transit-bg text-status-transit-fg",
        secondary: "bg-cotton text-strawberry border border-bubblegum/30",
        outline: "border border-border text-ink-secondary bg-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
