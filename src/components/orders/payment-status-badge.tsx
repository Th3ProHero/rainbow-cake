import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { PaymentStatus } from "@/lib/constants";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

const variantMap: Record<PaymentStatus, "unpaid" | "partialPayment" | "paid"> = {
  UNPAID: "unpaid",
  PARTIAL: "partialPayment",
  PAID: "paid",
  CREDIT: "paid",
};

export function PaymentStatusBadge({ status, className }: PaymentStatusBadgeProps) {
  return (
    <Badge variant={variantMap[status]} className={className}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
