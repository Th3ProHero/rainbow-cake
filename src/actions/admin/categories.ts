"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { categorySchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export interface CategoryActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("No tienes permisos de administrador.");
  }
  return session;
}

/**
 * Create a new category
 */
export async function createCategoryAction(
  _prevState: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    await requireAdmin();

    const name = ((formData.get("name") as string) || "").trim();
    let slug = ((formData.get("slug") as string) || "").trim();
    const sortOrderRaw = formData.get("sortOrder");
    const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw as string, 10) : 0;

    if (!slug && name) {
      slug = slugify(name);
    }

    const parsed = categorySchema.safeParse({ name, slug, sortOrder });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      return { success: false, error: "Revisa los campos.", fieldErrors };
    }

    // Check unique slug
    const existing = await prisma.category.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return {
        success: false,
        error: "Ya existe una categoría con este slug.",
        fieldErrors: { slug: "Slug ya registrado." },
      };
    }

    await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        sortOrder: parsed.data.sortOrder,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/catalog");

    return {
      success: true,
      message: `Categoría "${parsed.data.name}" creada exitosamente.`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado al crear categoría.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing category
 */
export async function updateCategoryAction(
  _prevState: CategoryActionResult | null,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    await requireAdmin();

    const id = formData.get("id") as string;
    const name = ((formData.get("name") as string) || "").trim();
    let slug = ((formData.get("slug") as string) || "").trim();
    const sortOrderRaw = formData.get("sortOrder");
    const sortOrder = sortOrderRaw ? parseInt(sortOrderRaw as string, 10) : 0;

    if (!id) return { success: false, error: "ID de categoría no especificado." };

    if (!slug && name) {
      slug = slugify(name);
    }

    const parsed = categorySchema.safeParse({ name, slug, sortOrder });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      return { success: false, error: "Revisa los campos.", fieldErrors };
    }

    // Check slug uniqueness excluding this category
    const existing = await prisma.category.findFirst({
      where: {
        slug: parsed.data.slug,
        id: { not: id },
      },
    });
    if (existing) {
      return {
        success: false,
        error: "Ya existe otra categoría con este slug.",
        fieldErrors: { slug: "Slug en uso por otra categoría." },
      };
    }

    await prisma.category.update({
      where: { id },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        sortOrder: parsed.data.sortOrder,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Categoría actualizada correctamente.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar categoría.";
    return { success: false, error: message };
  }
}

/**
 * Delete a category (only if no products are assigned)
 */
export async function deleteCategoryAction(id: string): Promise<CategoryActionResult> {
  try {
    await requireAdmin();

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      return {
        success: false,
        error: `No se puede eliminar la categoría porque contiene ${productCount} producto(s). Reasigna o archiva los productos primero.`,
      };
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Categoría eliminada correctamente.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al eliminar categoría.";
    return { success: false, error: message };
  }
}

/**
 * Reorder categories by array of IDs
 */
export async function reorderCategoriesAction(
  orderedIds: string[]
): Promise<CategoryActionResult> {
  try {
    await requireAdmin();

    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    revalidatePath("/admin/categories");
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Orden de categorías actualizado.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al reordenar categorías.";
    return { success: false, error: message };
  }
}
