import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  UsersTable,
  type SerializedAdminUser,
  type UserOrderItemDetail,
  type SerializedReturn,
} from "./users-table";
import {
  calculateAmountDue,
  calculateTotalPaid,
  calculateBalance,
  derivePaymentStatus,
} from "@/lib/domain/payment";

export const metadata = {
  title: "Directorio de Usuarios | Admin Rainbow Cake GO",
  description: "Directorio de clientes registrados, artículos solicitados, control de pagos y comprobantes.",
};

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/users");
  }

  const dbUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            orderBy: { createdAt: "desc" },
            include: {
              product: {
                select: {
                  imagePath: true,
                },
              },
              allocations: {
                include: {
                  payment: true,
                },
              },
            },
          },
        },
      },
      returns: {
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      },
    },
  });

  const users: SerializedAdminUser[] = dbUsers.map((u) => {
    let activeItemsCount = 0;
    let totalBalanceDue = 0;
    const flatItems: UserOrderItemDetail[] = [];

    for (const order of u.orders) {
      for (const item of order.items) {
        if (item.status !== "CANCELLED" && item.status !== "DELIVERED") {
          activeItemsCount++;
        }

        const due = calculateAmountDue({
          quantity: item.quantity,
          quantityCancelled: item.quantityCancelled,
          snapshotUnitPrice: Number(item.snapshotUnitPrice),
        });

        const paid = calculateTotalPaid(
          item.allocations.map((a) => ({
            amountApplied: Number(a.amountApplied),
          }))
        );

        const balance = calculateBalance(
          {
            quantity: item.quantity,
            quantityCancelled: item.quantityCancelled,
            snapshotUnitPrice: Number(item.snapshotUnitPrice),
          },
          item.allocations.map((a) => ({
            amountApplied: Number(a.amountApplied),
          }))
        );

        const paymentStatus = derivePaymentStatus(
          {
            quantity: item.quantity,
            quantityCancelled: item.quantityCancelled,
            snapshotUnitPrice: Number(item.snapshotUnitPrice),
          },
          item.allocations.map((a) => ({
            amountApplied: Number(a.amountApplied),
          }))
        );

        if (item.status !== "CANCELLED") {
          totalBalanceDue += Math.max(0, balance);
        }

        flatItems.push({
          id: item.id,
          orderId: order.id,
          orderCode: order.code,
          orderCreatedAt: order.createdAt.toISOString(),
          snapshotName: item.snapshotName,
          snapshotSku: item.snapshotSku,
          snapshotUnitPrice: Number(item.snapshotUnitPrice),
          quantity: item.quantity,
          quantityDelivered: item.quantityDelivered,
          quantityCancelled: item.quantityCancelled,
          status: item.status,
          productImageUrl: item.product?.imagePath
            ? `/api/files/${item.product.imagePath}`
            : null,
          due,
          paid,
          balance,
          paymentStatus,
          allocations: item.allocations.map((a) => ({
            id: a.id,
            amountApplied: Number(a.amountApplied),
            paymentId: a.paymentId,
            paymentMethod: a.payment.method,
            paymentPaidAt: a.payment.paidAt.toISOString(),
            paymentReference: a.payment.reference,
            paymentFilePath: a.payment.filePath,
            paymentMimeType: a.payment.mimeType,
            paymentOriginalName: a.payment.originalName,
          })),
        });
      }
    }

    // Serialize returns
    const userReturns: SerializedReturn[] = u.returns.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      receiptFilePath: r.receiptFilePath,
      receiptMimeType: r.receiptMimeType,
      receiptOriginalName: r.receiptOriginalName,
      completedAt: r.completedAt?.toISOString() || null,
      createdAt: r.createdAt.toISOString(),
      items: r.items.map((ri) => ({
        id: ri.id,
        orderItemId: ri.orderItemId,
        refundAmount: Number(ri.refundAmount),
        snapshotName: ri.orderItem.snapshotName,
        snapshotSku: ri.orderItem.snapshotSku,
      })),
    }));

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp,
      role: u.role,
      isActive: u.isActive,
      internalNotes: u.internalNotes,
      createdAt: u.createdAt.toISOString(),
      ordersCount: u.orders.length,
      activeItemsCount,
      totalBalanceDue,
      items: flatItems,
      returns: userReturns,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          Directorio de Usuarios
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Clientes registrados con WhatsApp. Haz clic en cualquier usuario para ver sus artículos, marcar/desmarcar pagos y adjuntar fotos de comprobantes.
        </p>
      </div>

      <UsersTable users={users} />
    </div>
  );
}
