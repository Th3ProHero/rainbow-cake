export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isOfferActive, discountPercentage } from "@/lib/domain/offer";
import { ProductDetailView } from "./product-detail-view";
import type { CatalogProduct } from "@/types";

export async function generateMetadata(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const product = await prisma.product.findUnique({
    where: { id },
    select: { name: true },
  });

  return {
    title: product ? `${product.name} — Rainbow Cake GO` : "Producto no encontrado",
  };
}

export default async function ProductDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const productRaw = await prisma.product.findUnique({
    where: {
      id,
      status: "ACTIVE",
      archivedAt: null,
    },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!productRaw) {
    notFound();
  }

  const now = new Date();
  const offerPayload = {
    price: productRaw.price.toString(),
    offerPrice: productRaw.offerPrice ? productRaw.offerPrice.toString() : null,
    offerStartsAt: productRaw.offerStartsAt,
    offerEndsAt: productRaw.offerEndsAt,
  };

  const offerActive = isOfferActive(offerPayload, now);
  const discount = offerActive ? discountPercentage(offerPayload) : null;

  const product: CatalogProduct = {
    id: productRaw.id,
    sku: productRaw.sku,
    name: productRaw.name,
    description: productRaw.description,
    price: parseFloat(productRaw.price.toString()),
    offerPrice: productRaw.offerPrice ? parseFloat(productRaw.offerPrice.toString()) : null,
    isOfferActive: offerActive,
    discountPercent: discount,
    availability: productRaw.availability,
    status: productRaw.status,
    releaseDate: productRaw.releaseDate,
    imagePath: productRaw.imagePath,
    category: productRaw.category,
    merchType: productRaw.merchType,
  };

  return <ProductDetailView product={product} />;
}
