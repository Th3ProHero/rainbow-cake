export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { isOfferActive, discountPercentage } from "@/lib/domain/offer";
import { CatalogView } from "./catalog-view";
import type { CatalogProduct } from "@/types";

export const metadata = {
  title: "Catálogo — Rainbow Cake GO",
  description: "Explora nuestro catálogo de artículos de merch exclusivos y haz tu pedido.",
};

export default async function CatalogPage() {
  const [productsRaw, categories, bannersRaw, whatsappSetting] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: "ACTIVE",
        archivedAt: null,
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    prisma.promoBanner.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    }),
    prisma.setting.findUnique({
      where: { key: "WHATSAPP_PHONE" },
    }),
  ]);

  const now = new Date();
  const products: CatalogProduct[] = productsRaw.map((p) => {
    const offerPayload = {
      price: p.price.toString(),
      offerPrice: p.offerPrice ? p.offerPrice.toString() : null,
      offerStartsAt: p.offerStartsAt,
      offerEndsAt: p.offerEndsAt,
    };

    const offerActive = isOfferActive(offerPayload, now);
    const discount = offerActive ? discountPercentage(offerPayload) : null;

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      price: parseFloat(p.price.toString()),
      offerPrice: p.offerPrice ? parseFloat(p.offerPrice.toString()) : null,
      isOfferActive: offerActive,
      discountPercent: discount,
      availability: p.availability,
      status: p.status,
      releaseDate: p.releaseDate,
      imagePath: p.imagePath,
      category: p.category,
      merchType: p.merchType,
    };
  });

  const banners = bannersRaw.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    imagePath: b.imagePath,
    merchType: b.merchType,
    ordersOpenAt: b.ordersOpenAt ? b.ordersOpenAt.toISOString() : null,
    ordersCloseAt: b.ordersCloseAt ? b.ordersCloseAt.toISOString() : null,
    whatsappMsg: b.whatsappMsg,
  }));

  const whatsappPhone =
    whatsappSetting?.value || process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "";

  return (
    <CatalogView
      products={products}
      categories={categories}
      banners={banners}
      whatsappPhone={whatsappPhone}
    />
  );
}
