import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProductForm } from "../../product-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Editar Producto — Rainbow Cake GO",
};

export default async function EditProductPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!product) {
    notFound();
  }

  const initialData = {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    categoryId: product.categoryId,
    merchType: product.merchType,
    price: product.price.toString(),
    offerPrice: product.offerPrice ? product.offerPrice.toString() : null,
    offerStartsAt: product.offerStartsAt,
    offerEndsAt: product.offerEndsAt,
    releaseDate: product.releaseDate,
    availability: product.availability,
    status: product.status,
    stock: product.stock,
    imagePath: product.imagePath,
  };

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
          Editar Producto
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Modifica los detalles, precios u oferta de {product.name}
        </p>
      </div>

      <ProductForm categories={categories} initialData={initialData} />
    </div>
  );
}
