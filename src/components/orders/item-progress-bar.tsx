"use client";

import type { OrderItemStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { ORDER_ITEM_STATUS_LABELS, STATUS_PROGRESS_ORDER } from "@/lib/constants";

interface ItemProgressBarProps {
  status: OrderItemStatus;
  className?: string;
}

/**
 * Segmented progress bar showing item status progression.
 * Pendiente → En tránsito → En almacén → Entregado
 * This is the distinctive visual element of Rainbow Cake GO (section 11).
 */
export function ItemProgressBar({ status, className }: ItemProgressBarProps) {
  const segments = STATUS_PROGRESS_ORDER;
  const currentIndex = segments.indexOf(status);
  const isCancelled = status === "CANCELLED";
  const isPartial = status === "PARTIALLY_DELIVERED";

  // For PARTIALLY_DELIVERED, show up to IN_WAREHOUSE + partial fill on next
  const effectiveIndex = isPartial ? segments.indexOf("IN_WAREHOUSE") : currentIndex;

  return (
    <div className={cn("w-full", className)}>
      {/* Progress bar segments */}
      <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-border-light">
        {segments.map((seg, i) => {
          let bgColor: string;

          if (isCancelled) {
            bgColor = "bg-status-cancelled-bg";
          } else if (i <= effectiveIndex) {
            // Gradient from light to dark pink
            const colors = [
              "bg-cotton",
              "bg-bubblegum/50",
              "bg-bubblegum",
              "bg-strawberry",
            ];
            bgColor = colors[i] || "bg-strawberry";
          } else if (isPartial && i === effectiveIndex + 1) {
            bgColor = "bg-bubblegum/30";
          } else {
            bgColor = "bg-transparent";
          }

          return (
            <div
              key={seg}
              className={cn(
                "flex-1 rounded-full transition-all duration-500 ease-out progress-segment",
                bgColor
              )}
            />
          );
        })}
      </div>

      {/* Status label */}
      <p className="text-xs text-ink-secondary mt-1.5 text-center">
        {isCancelled
          ? "Cancelado"
          : isPartial
            ? "Entrega parcial"
            : ORDER_ITEM_STATUS_LABELS[status]}
      </p>
    </div>
  );
}
