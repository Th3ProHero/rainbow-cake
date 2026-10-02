export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BannersAdmin } from "./banners-admin";

export const metadata = {
  title: "Banners Promocionales | Admin Rainbow Cake GO",
  description: "Gestiona banners promocionales, periodos de pedidos y mensajes de WhatsApp.",
};

export default async function AdminBannersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/banners");
  }

  const [banners, whatsappSetting] = await Promise.all([
    prisma.promoBanner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.setting.findUnique({ where: { key: "WHATSAPP_PHONE" } }),
  ]);

  const serializedBanners = banners.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    imagePath: b.imagePath,
    merchType: b.merchType,
    ordersOpenAt: b.ordersOpenAt?.toISOString() ?? null,
    ordersCloseAt: b.ordersCloseAt?.toISOString() ?? null,
    whatsappMsg: b.whatsappMsg,
    isActive: b.isActive,
    sortOrder: b.sortOrder,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          Banners Promocionales
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Crea y gestiona banners con periodos de pedidos, tipo de merch y mensajes de WhatsApp para el catálogo.
        </p>
      </div>

      <BannersAdmin
        banners={serializedBanners}
        whatsappPhone={whatsappSetting?.value || ""}
      />
    </div>
  );
}
