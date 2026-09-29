export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ItemsTable, type SerializedAdminItem } from "./items-table";

export const metadata = {
  title: "Gestión de Artículos | Admin Rainbow Cake GO",
  description: "Control de artículos, estados de entrega, entregas parciales y pagos.",
};

export default async function AdminItemsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/items");
  }

  // Fetch all items with relations
  const [dbItems, categories] = await Promise.all([
    prisma.orderItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                whatsapp: true,
              },
            },
          },
        },
        product: {
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        },
        allocations: {
          select: {
            id: true,
            amountApplied: true,
            paymentId: true,
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  // Serialize items
  const items: SerializedAdminItem[] = dbItems.map((item) => ({
    id: item.id,
    orderId: item.orderId,
    orderCode: item.order.code,
    orderCreatedAt: item.order.createdAt.toISOString(),
    orderNote: item.order.note,
    userId: item.order.user.id,
    userName: item.order.user.name,
    userEmail: item.order.user.email,
    userPhone: item.order.user.whatsapp,
    productId: item.productId,
    snapshotName: item.snapshotName,
    snapshotSku: item.snapshotSku,
    snapshotUnitPrice: Number(item.snapshotUnitPrice),
    quantity: item.quantity,
    quantityDelivered: item.quantityDelivered,
    quantityCancelled: item.quantityCancelled,
    status: item.status,
    categoryName: item.product.category.name,
    imageUrl: item.product.imagePath ? `/api/files/${item.product.imagePath}` : null,
    allocations: item.allocations.map((a) => ({
      id: a.id,
      amountApplied: Number(a.amountApplied),
      paymentId: a.paymentId,
    })),
    logs: item.logs.map((log) => ({
      id: log.id,
      fromStatus: log.fromStatus,
      toStatus: log.toStatus,
      deliveredDelta: log.deliveredDelta,
      note: log.note,
      createdAt: log.createdAt.toISOString(),
      changedByName: log.changedBy.name,
    })),
  }));

  // Quick metrics
  const totalItemsCount = items.length;
  const inWarehouseCount = items.filter((i) => i.status === "IN_WAREHOUSE").length;
  const inTransitCount = items.filter((i) => i.status === "IN_TRANSIT").length;
  const pendingCount = items.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
            Panel de Artículos
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Gestión granular de cada artículo: estados de importación, entregas presenciales y pagos.
          </p>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-cotton/70 border border-bubblegum/30 whitespace-nowrap">
            <span className="text-ink-secondary">Pendientes:</span>{" "}
            <strong className="text-ink">{pendingCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200/60 whitespace-nowrap">
            <span className="text-amber-800">En tránsito:</span>{" "}
            <strong className="text-amber-900">{inTransitCount}</strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-200/60 whitespace-nowrap">
            <span className="text-purple-800">En almacén:</span>{" "}
            <strong className="text-purple-900">{inWarehouseCount}</strong>
          </div>
        </div>
      </div>

      {/* Main Table & Filters */}
      <ItemsTable items={items} categories={categories} />
    </div>
  );
}
