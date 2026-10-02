"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  validateFileContent,
  saveUploadedFile,
  deleteUploadedFile,
  ALLOWED_IMAGE_MIMES,
} from "@/lib/files";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("No tienes permisos de administrador.");
  }
  return session;
}

export interface BannerActionResult {
  success: boolean;
  error?: string;
  message?: string;
  bannerId?: string;
}

/**
 * Create a new promo banner
 */
export async function createBannerAction(
  formData: FormData
): Promise<BannerActionResult> {
  try {
    await requireAdmin();

    const title = ((formData.get("title") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim() || null;
    const merchType = ((formData.get("merchType") as string) || "").trim() || null;
    const ordersOpenAt = (formData.get("ordersOpenAt") as string) || null;
    const ordersCloseAt = (formData.get("ordersCloseAt") as string) || null;
    const whatsappMsg = ((formData.get("whatsappMsg") as string) || "").trim() || null;
    const sortOrder = parseInt((formData.get("sortOrder") as string) || "0", 10) || 0;

    if (!title) {
      return { success: false, error: "El título del banner es obligatorio." };
    }

    // Handle image upload
    let imagePath: string | null = null;
    const imageFile = formData.get("image") as File | null;
    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const validation = await validateFileContent(buffer, ALLOWED_IMAGE_MIMES);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      imagePath = await saveUploadedFile(buffer, "banners", validation.ext!);
    }

    const banner = await prisma.promoBanner.create({
      data: {
        title,
        description,
        imagePath,
        merchType,
        ordersOpenAt: ordersOpenAt ? new Date(ordersOpenAt) : null,
        ordersCloseAt: ordersCloseAt ? new Date(ordersCloseAt) : null,
        whatsappMsg,
        sortOrder,
      },
    });

    revalidatePath("/admin/banners");
    revalidatePath("/catalog");

    return {
      success: true,
      message: "Banner creado con éxito.",
      bannerId: banner.id,
    };
  } catch (err: unknown) {
    console.error("Error al crear banner:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing promo banner
 */
export async function updateBannerAction(
  formData: FormData
): Promise<BannerActionResult> {
  try {
    await requireAdmin();

    const id = (formData.get("id") as string) || "";
    const title = ((formData.get("title") as string) || "").trim();
    const description = ((formData.get("description") as string) || "").trim() || null;
    const merchType = ((formData.get("merchType") as string) || "").trim() || null;
    const ordersOpenAt = (formData.get("ordersOpenAt") as string) || null;
    const ordersCloseAt = (formData.get("ordersCloseAt") as string) || null;
    const whatsappMsg = ((formData.get("whatsappMsg") as string) || "").trim() || null;
    const sortOrder = parseInt((formData.get("sortOrder") as string) || "0", 10) || 0;

    if (!id) {
      return { success: false, error: "ID del banner no proporcionado." };
    }
    if (!title) {
      return { success: false, error: "El título del banner es obligatorio." };
    }

    const existing = await prisma.promoBanner.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Banner no encontrado." };
    }

    // Handle image upload
    let imagePath = existing.imagePath;
    const imageFile = formData.get("image") as File | null;
    const removeImage = formData.get("removeImage") === "true";

    if (removeImage && !imageFile?.size) {
      await deleteUploadedFile(existing.imagePath);
      imagePath = null;
    }

    if (imageFile && imageFile.size > 0) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      const validation = await validateFileContent(buffer, ALLOWED_IMAGE_MIMES);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      // Delete old image
      await deleteUploadedFile(existing.imagePath);
      imagePath = await saveUploadedFile(buffer, "banners", validation.ext!);
    }

    await prisma.promoBanner.update({
      where: { id },
      data: {
        title,
        description,
        imagePath,
        merchType,
        ordersOpenAt: ordersOpenAt ? new Date(ordersOpenAt) : null,
        ordersCloseAt: ordersCloseAt ? new Date(ordersCloseAt) : null,
        whatsappMsg,
        sortOrder,
      },
    });

    revalidatePath("/admin/banners");
    revalidatePath("/catalog");

    return { success: true, message: "Banner actualizado con éxito." };
  } catch (err: unknown) {
    console.error("Error al actualizar banner:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Delete a promo banner
 */
export async function deleteBannerAction(
  id: string
): Promise<BannerActionResult> {
  try {
    await requireAdmin();

    const banner = await prisma.promoBanner.findUnique({ where: { id } });
    if (!banner) {
      return { success: false, error: "Banner no encontrado." };
    }

    await deleteUploadedFile(banner.imagePath);
    await prisma.promoBanner.delete({ where: { id } });

    revalidatePath("/admin/banners");
    revalidatePath("/catalog");

    return { success: true, message: "Banner eliminado." };
  } catch (err: unknown) {
    console.error("Error al eliminar banner:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Toggle banner active state
 */
export async function toggleBannerAction(
  id: string
): Promise<BannerActionResult> {
  try {
    await requireAdmin();

    const banner = await prisma.promoBanner.findUnique({ where: { id } });
    if (!banner) {
      return { success: false, error: "Banner no encontrado." };
    }

    await prisma.promoBanner.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });

    revalidatePath("/admin/banners");
    revalidatePath("/catalog");

    return {
      success: true,
      message: banner.isActive ? "Banner desactivado." : "Banner activado.",
    };
  } catch (err: unknown) {
    console.error("Error al cambiar estado del banner:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}
