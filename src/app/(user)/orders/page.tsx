import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { OrdersList, type SerializedOrder } from "./orders-list";

export const metadata = {
  title: "Mis Pedidos | Rainbow Cake GO",
  description: "Consulta el estado y seguimiento de tus pedidos en Rainbow Cake GO.",
};

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login?redirectTo=/orders");
  }

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { name: true },
  });

  const userFirstName = user?.name ? user.name.split(" ")[0] : "Cliente";

  // Fetch business whatsapp setting
  const waSetting = await prisma.setting.findUnique({
    where: { key: "WHATSAPP_PHONE" },
  });
  const whatsappPhone = waSetting?.value || process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "+5215512345678";

  // Fetch all orders for this user
  const dbOrders = await prisma.order.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: {
              imagePath: true,
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
                  role: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Serialize orders for client component
  const orders: SerializedOrder[] = dbOrders.map((order) => ({
    id: order.id,
    code: order.code,
    createdAt: order.createdAt.toISOString(),
    note: order.note,
    items: order.items.map((item) => {
      const firstImage = item.product?.imagePath
        ? `/api/files/${item.product.imagePath}`
        : null;

      return {
        id: item.id,
        productId: item.productId,
        snapshotName: item.snapshotName,
        snapshotSku: item.snapshotSku,
        snapshotUnitPrice: Number(item.snapshotUnitPrice),
        quantity: item.quantity,
        quantityDelivered: item.quantityDelivered,
        quantityCancelled: item.quantityCancelled,
        status: item.status,
        imageUrl: firstImage,
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
          changedByName: log.changedBy?.name || "Sistema",
          changedByRole: log.changedBy?.role || "USER",
        })),
      };
    }),
  }));

  return (
    <div className="container max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
            Mis Pedidos
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Consulta el estado de entrega y los abonos de cada uno de tus artículos.
          </p>
        </div>
      </div>

      <OrdersList
        orders={orders}
        whatsappPhone={whatsappPhone}
        userFirstName={userFirstName}
      />
    </div>
  );
}
