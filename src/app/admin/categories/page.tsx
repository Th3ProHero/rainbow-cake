export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { CategoriesManager } from "./categories-manager";

export const metadata = {
  title: "Categorías — Rainbow Cake GO",
};

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return <CategoriesManager initialCategories={categories} />;
}
