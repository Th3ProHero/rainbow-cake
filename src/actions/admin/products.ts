"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { productSchema } from "@/lib/validators";
import {
  validateFileContent,
  saveUploadedFile,
  deleteUploadedFile,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/files";
import type { ProductAvailability, ProductStatus } from "@prisma/client";

export interface ProductActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  productId?: string;
}

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("No tienes permisos de administrador.");
  }
  return session;
}

/**
 * Create a new product
 */
export async function createProductAction(
  _prevState: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  try {
    await requireAdmin();

    const sku = ((formData.get("sku") as string) || "").toUpperCase().trim();
    const name = ((formData.get("name") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim() || null;
    const categoryId = (formData.get("categoryId") as string) || "";
    const merchType = ((formData.get("merchType") as string) || "").trim() || null;

    const priceRaw = formData.get("price");
    const offerPriceRaw = formData.get("offerPrice");
    const offerStartsAtRaw = formData.get("offerStartsAt") as string;
    const offerEndsAtRaw = formData.get("offerEndsAt") as string;
    const releaseDateRaw = formData.get("releaseDate") as string;

    const availability = (formData.get("availability") as ProductAvailability) || "IN_STOCK";
    const status = (formData.get("status") as ProductStatus) || "ACTIVE";
    const stockRaw = formData.get("stock");

    const price = priceRaw ? parseFloat(priceRaw as string) : 0;
    const offerPrice = offerPriceRaw ? parseFloat(offerPriceRaw as string) : null;
    const stock = stockRaw ? parseInt(stockRaw as string, 10) : null;

    const offerStartsAt = offerStartsAtRaw ? new Date(offerStartsAtRaw) : null;
    const offerEndsAt = offerEndsAtRaw ? new Date(offerEndsAtRaw) : null;
    const releaseDate = releaseDateRaw ? new Date(releaseDateRaw) : null;

    // Validate with Zod
    const parsed = productSchema.safeParse({
      sku,
      name,
      description,
      categoryId,
      merchType,
      price,
      offerPrice,
      offerStartsAt,
      offerEndsAt,
      releaseDate,
      availability,
      status,
      stock,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      return { success: false, error: "Revisa los campos del formulario.", fieldErrors };
    }

    // Check unique SKU
    const existingSku = await prisma.product.findUnique({
      where: { sku: parsed.data.sku },
    });
    if (existingSku) {
      return {
        success: false,
        error: "Ya existe un producto con este SKU.",
        fieldErrors: { sku: "Este SKU ya está registrado." },
      };
    }

    // Handle Image Upload if present
    let imagePath: string | null = null;
    const imageFile = formData.get("image") as File | null;

    if (imageFile && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = await validateFileContent(buffer, ALLOWED_IMAGE_MIMES);
      if (!validation.valid || !validation.ext) {
        return {
          success: false,
          error: validation.error || "Formato de imagen inválido.",
          fieldErrors: { image: validation.error || "Formato de imagen inválido." },
        };
      }

      imagePath = await saveUploadedFile(buffer, "products", validation.ext);
    }

    const product = await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        merchType: parsed.data.merchType,
        price: parsed.data.price,
        offerPrice: parsed.data.offerPrice,
        offerStartsAt: parsed.data.offerStartsAt,
        offerEndsAt: parsed.data.offerEndsAt,
        releaseDate: parsed.data.releaseDate,
        availability: parsed.data.availability,
        status: parsed.data.status,
        stock: parsed.data.stock,
        imagePath,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return {
      success: true,
      message: `Producto "${product.name}" creado exitosamente.`,
      productId: product.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error inesperado al crear producto.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing product
 */
export async function updateProductAction(
  _prevState: ProductActionResult | null,
  formData: FormData
): Promise<ProductActionResult> {
  try {
    await requireAdmin();

    const id = formData.get("id") as string;
    if (!id) return { success: false, error: "ID de producto no especificado." };

    const currentProduct = await prisma.product.findUnique({
      where: { id },
    });
    if (!currentProduct) {
      return { success: false, error: "Producto no encontrado." };
    }

    const sku = ((formData.get("sku") as string) || "").toUpperCase().trim();
    const name = ((formData.get("name") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim() || null;
    const categoryId = (formData.get("categoryId") as string) || "";
    const merchType = ((formData.get("merchType") as string) || "").trim() || null;

    const priceRaw = formData.get("price");
    const offerPriceRaw = formData.get("offerPrice");
    const offerStartsAtRaw = formData.get("offerStartsAt") as string;
    const offerEndsAtRaw = formData.get("offerEndsAt") as string;
    const releaseDateRaw = formData.get("releaseDate") as string;

    const availability = (formData.get("availability") as ProductAvailability) || "IN_STOCK";
    const status = (formData.get("status") as ProductStatus) || "ACTIVE";
    const stockRaw = formData.get("stock");

    const price = priceRaw ? parseFloat(priceRaw as string) : 0;
    const offerPrice = offerPriceRaw ? parseFloat(offerPriceRaw as string) : null;
    const stock = stockRaw ? parseInt(stockRaw as string, 10) : null;

    const offerStartsAt = offerStartsAtRaw ? new Date(offerStartsAtRaw) : null;
    const offerEndsAt = offerEndsAtRaw ? new Date(offerEndsAtRaw) : null;
    const releaseDate = releaseDateRaw ? new Date(releaseDateRaw) : null;

    const parsed = productSchema.safeParse({
      sku,
      name,
      description,
      categoryId,
      merchType,
      price,
      offerPrice,
      offerStartsAt,
      offerEndsAt,
      releaseDate,
      availability,
      status,
      stock,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message;
      }
      return { success: false, error: "Revisa los campos del formulario.", fieldErrors };
    }

    // Check unique SKU excluding current product
    const existingSku = await prisma.product.findFirst({
      where: {
        sku: parsed.data.sku,
        id: { not: id },
      },
    });
    if (existingSku) {
      return {
        success: false,
        error: "Ya existe otro producto con este SKU.",
        fieldErrors: { sku: "SKU en uso por otro producto." },
      };
    }

    // Handle Image upload or removal
    let newImagePath = currentProduct.imagePath;
    const removeImage = formData.get("removeImage") === "true";
    const imageFile = formData.get("image") as File | null;

    if (removeImage && currentProduct.imagePath) {
      await deleteUploadedFile(currentProduct.imagePath);
      newImagePath = null;
    } else if (imageFile && imageFile.size > 0) {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = await validateFileContent(buffer, ALLOWED_IMAGE_MIMES);
      if (!validation.valid || !validation.ext) {
        return {
          success: false,
          error: validation.error || "Formato de imagen inválido.",
          fieldErrors: { image: validation.error || "Formato de imagen inválido." },
        };
      }

      // Delete previous image if updating
      if (currentProduct.imagePath) {
        await deleteUploadedFile(currentProduct.imagePath);
      }

      newImagePath = await saveUploadedFile(buffer, "products", validation.ext);
    }

    await prisma.product.update({
      where: { id },
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        description: parsed.data.description,
        categoryId: parsed.data.categoryId,
        merchType: parsed.data.merchType,
        price: parsed.data.price,
        offerPrice: parsed.data.offerPrice,
        offerStartsAt: parsed.data.offerStartsAt,
        offerEndsAt: parsed.data.offerEndsAt,
        releaseDate: parsed.data.releaseDate,
        availability: parsed.data.availability,
        status: parsed.data.status,
        stock: parsed.data.stock,
        imagePath: newImagePath,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Producto actualizado correctamente.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar producto.";
    return { success: false, error: message };
  }
}

/**
 * Duplicate a product
 */
export async function duplicateProductAction(id: string): Promise<ProductActionResult> {
  try {
    await requireAdmin();

    const original = await prisma.product.findUnique({
      where: { id },
    });

    if (!original) {
      return { success: false, error: "Producto no encontrado." };
    }

    // Generate unique SKU for duplicate
    let copySku = `${original.sku}-COPIA`;
    let counter = 1;
    while (await prisma.product.findUnique({ where: { sku: copySku } })) {
      copySku = `${original.sku}-COPIA-${counter++}`;
    }

    const duplicate = await prisma.product.create({
      data: {
        sku: copySku,
        name: `${original.name} (Copia)`,
        description: original.description,
        categoryId: original.categoryId,
        merchType: original.merchType,
        price: original.price,
        offerPrice: original.offerPrice,
        offerStartsAt: original.offerStartsAt,
        offerEndsAt: original.offerEndsAt,
        releaseDate: original.releaseDate,
        availability: original.availability,
        status: "HIDDEN", // Hidden by default so admin can review before publishing
        stock: original.stock,
        imagePath: original.imagePath,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return {
      success: true,
      message: `Producto duplicado como "${duplicate.name}" con SKU ${duplicate.sku}.`,
      productId: duplicate.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al duplicar producto.";
    return { success: false, error: message };
  }
}

/**
 * Archive a product (Soft Delete)
 */
export async function archiveProductAction(id: string): Promise<ProductActionResult> {
  try {
    await requireAdmin();

    await prisma.product.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        status: "HIDDEN",
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Producto archivado.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al archivar producto.";
    return { success: false, error: message };
  }
}

/**
 * Restore an archived product
 */
export async function restoreProductAction(id: string): Promise<ProductActionResult> {
  try {
    await requireAdmin();

    await prisma.product.update({
      where: { id },
      data: {
        archivedAt: null,
        status: "ACTIVE",
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Producto restaurado.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al restaurar producto.";
    return { success: false, error: message };
  }
}

/**
 * Batch update product availability
 */
export async function batchUpdateAvailabilityAction(
  productIds: string[],
  availability: ProductAvailability
): Promise<ProductActionResult> {
  try {
    await requireAdmin();

    if (!productIds || productIds.length === 0) {
      return { success: false, error: "Selecciona al menos un producto." };
    }

    await prisma.product.updateMany({
      where: {
        id: { in: productIds },
      },
      data: {
        availability,
      },
    });

    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return {
      success: true,
      message: `Disponibilidad actualizada para ${productIds.length} producto(s).`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar disponibilidad en lote.";
    return { success: false, error: message };
  }
}
