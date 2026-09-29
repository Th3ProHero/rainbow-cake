export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { prisma } from "@/lib/db";
import { isOfferActive } from "@/lib/domain/offer";
import { ProductsTable } from "./products-table";
import type { Prisma, ProductAvailability, ProductStatus } from "@prisma/client";

export const metadata = {
  title: "Productos — Rainbow Cake GO",
};

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    availability?: string;
    status?: string;
  }>;
}

function ProductsTableSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex gap-4">
        <div className="h-10 bg-pink-100 rounded flex-1"></div>
        <div className="h-10 bg-pink-100 rounded w-32"></div>
      </div>
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-pink-50 rounded"></div>
        ))}
      </div>
    </div>
  );
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const { q, category, availability, status } = await searchParams;

  const where: Prisma.ProductWhereInput = {};

  // Text search on name or SKU
  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q.trim(), mode: "insensitive" } },
      { sku: { contains: q.trim(), mode: "insensitive" } },
    ];
  }

  // Category filter
  if (category && category !== "ALL") {
    where.categoryId = category;
  }

  // Availability filter
  if (availability && availability !== "ALL") {
    where.availability = availability as ProductAvailability;
  }

  // Status & archived filter
  if (status === "ARCHIVED") {
    where.archivedAt = { not: null };
  } else if (status === "HIDDEN") {
    where.status = "HIDDEN";
    where.archivedAt = null;
  } else if (status === "ALL") {
    // Show all, including archived
  } else {
    // Default: ACTIVE and NOT archived
    where.status = "ACTIVE";
    where.archivedAt = null;
  }

  const [productsRaw, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const now = new Date();
  const products = productsRaw.map((p) => {
    const offerActive = isOfferActive(
      {
        price: p.price.toString(),
        offerPrice: p.offerPrice ? p.offerPrice.toString() : null,
        offerStartsAt: p.offerStartsAt,
        offerEndsAt: p.offerEndsAt,
      },
      now
    );

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      price: parseFloat(p.price.toString()),
      offerPrice: p.offerPrice ? parseFloat(p.offerPrice.toString()) : null,
      isOfferActive: offerActive,
      availability: p.availability,
      status: p.status,
      stock: p.stock,
      imagePath: p.imagePath,
      archivedAt: p.archivedAt,
      category: p.category,
      merchType: p.merchType,
    };
  });

  return (
    <Suspense fallback={<ProductsTableSkeleton />}>
      <ProductsTable
        products={products}
        categories={categories}
        totalCount={products.length}
      />
    </Suspense>
  );
}
