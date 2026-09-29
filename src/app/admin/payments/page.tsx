import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  PaymentsManager,
  type SerializedAdminPayment,
  type UserForPayment,
} from "./payments-manager";

export const metadata = {
  title: "Gestión de Pagos y Comprobantes | Admin Rainbow Cake GO",
  description: "Registro de pagos manuales, comprobantes y asignación a artículos.",
};

export default async function AdminPaymentsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/payments");
  }

  // Fetch payments and users with their orders
  const [dbPayments, dbUsers] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            whatsapp: true,
          },
        },
        allocations: {
          select: {
            id: true,
            orderItemId: true,
            amountApplied: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "USER", isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            items: {
              where: { status: { not: "CANCELLED" } },
              select: {
                id: true,
                orderId: true,
                snapshotName: true,
                snapshotSku: true,
                snapshotUnitPrice: true,
                quantity: true,
                quantityCancelled: true,
                status: true,
                allocations: {
                  select: {
                    id: true,
                    paymentId: true,
                    amountApplied: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // Serialize payments
  const payments: SerializedAdminPayment[] = dbPayments.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: p.user.name,
    userEmail: p.user.email,
    userPhone: p.user.whatsapp,
    paidAt: p.paidAt.toISOString(),
    amount: Number(p.amount || 0),
    method: p.method,
    reference: p.reference,
    note: p.note,
    filePath: p.filePath,
    mimeType: p.mimeType,
    originalName: p.originalName,
    createdAt: p.createdAt.toISOString(),
    allocations: p.allocations.map((a) => ({
      id: a.id,
      orderItemId: a.orderItemId,
      amountApplied: Number(a.amountApplied),
    })),
  }));

  // Serialize users for allocation
  const users: UserForPayment[] = dbUsers.map((u) => {
    const flatItems = u.orders.flatMap((order) =>
      order.items.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        orderCode: order.code,
        snapshotName: item.snapshotName,
        snapshotSku: item.snapshotSku,
        snapshotUnitPrice: Number(item.snapshotUnitPrice),
        quantity: item.quantity,
        quantityCancelled: item.quantityCancelled,
        status: item.status,
        totalPaid: item.allocations.reduce(
          (sum, a) => sum + Number(a.amountApplied),
          0
        ),
        allocations: item.allocations.map((a) => ({
          id: a.id,
          paymentId: a.paymentId,
          amountApplied: Number(a.amountApplied),
        })),
      }))
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp,
      orderItems: flatItems,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          Pagos y Comprobantes
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Control de transferencias, depósitos y asignación directa a los artículos de los clientes.
        </p>
      </div>

      <PaymentsManager payments={payments} users={users} />
    </div>
  );
}
