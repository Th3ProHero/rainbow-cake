import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  WhatsAppBroadcastView,
  type UserForBroadcast,
  type BroadcastTemplate,
  type RecentContactLog,
} from "./whatsapp-broadcast-view";

export const metadata = {
  title: "Difusión Asistida por WhatsApp | Admin Rainbow Cake GO",
  description: "Comunicación y avisos personalizados vía WhatsApp a clientes.",
};

export default async function AdminWhatsAppPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/whatsapp");
  }

  // Fetch users with their order items and allocations
  const [dbUsers, dbTemplates, dbLogs] = await Promise.all([
    prisma.user.findMany({
      where: { role: "USER", isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        orders: {
          select: {
            code: true,
            items: {
              select: {
                id: true,
                snapshotName: true,
                snapshotSku: true,
                snapshotUnitPrice: true,
                quantity: true,
                quantityCancelled: true,
                status: true,
                allocations: {
                  select: {
                    amountApplied: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.messageTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.whatsAppContactLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        user: { select: { name: true, whatsapp: true } },
        admin: { select: { name: true } },
      },
    }),
  ]);

  // Serialize users
  const users: UserForBroadcast[] = dbUsers.map((u) => {
    const flatItems = u.orders.flatMap((o) =>
      o.items.map((i) => ({
        id: i.id,
        orderCode: o.code,
        snapshotName: i.snapshotName,
        snapshotSku: i.snapshotSku,
        snapshotUnitPrice: Number(i.snapshotUnitPrice),
        quantity: i.quantity,
        quantityCancelled: i.quantityCancelled,
        status: i.status,
        allocations: i.allocations.map((a) => ({
          amountApplied: Number(a.amountApplied),
        })),
      }))
    );

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.whatsapp,
      items: flatItems,
    };
  });

  // Serialize templates
  const templates: BroadcastTemplate[] = dbTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    body: t.body,
  }));

  // Fallback template if none exists
  if (templates.length === 0) {
    templates.push({
      id: "default-1",
      name: "llegada_almacen",
      body: "¡Hola {nombre}! 🎉 Tu artículo {producto} del pedido {pedido} ya llegó a nuestro almacén. Tu saldo pendiente es de {saldo}. ¿Cuándo te gustaría coordinar la entrega personal?",
    });
  }

  // Serialize contact logs
  const recentLogs: RecentContactLog[] = dbLogs.map((l) => ({
    id: l.id,
    userName: l.user?.name || "Cliente",
    userPhone: l.user?.whatsapp || "",
    adminName: l.admin?.name || "Admin",
    message: l.message,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          Difusión Asistida por WhatsApp
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Avisa rápidamente a clientes sobre llegadas a almacén, saldos pendientes o confirma entregas con un solo clic.
        </p>
      </div>

      <WhatsAppBroadcastView
        users={users}
        templates={templates}
        recentLogs={recentLogs}
      />
    </div>
  );
}
