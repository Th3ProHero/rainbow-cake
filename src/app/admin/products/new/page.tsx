export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { ProductForm } from "../product-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Nuevo Producto — Rainbow Cake GO",
};

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="inline-flex items-center text-xs font-semibold text-strawberry hover:underline mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Volver a productos
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">
          Nuevo Producto
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Agrega un nuevo artículo a tu catálogo de merch
        </p>
      </div>

      <ProductForm categories={categories} />
    </div>
  );
}
