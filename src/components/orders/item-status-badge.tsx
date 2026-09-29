import type { OrderItemStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { ORDER_ITEM_STATUS_LABELS } from "@/lib/constants";

interface ItemStatusBadgeProps {
  status: OrderItemStatus;
  className?: string;
}

const variantMap: Record<OrderItemStatus, "pending" | "inTransit" | "inWarehouse" | "partiallyDelivered" | "delivered" | "cancelled"> = {
  PENDING: "pending",
  IN_TRANSIT: "inTransit",
  IN_WAREHOUSE: "inWarehouse",
  PARTIALLY_DELIVERED: "partiallyDelivered",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
};

export function ItemStatusBadge({ status, className }: ItemStatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]} className={className}>
      {ORDER_ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}
