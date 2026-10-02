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

export interface NewsActionResult {
  success: boolean;
  error?: string;
  message?: string;
  newsId?: string;
}

/**
 * Create a new news post
 */
export async function createNewsAction(
  formData: FormData
): Promise<NewsActionResult> {
  try {
    await requireAdmin();

    const title = ((formData.get("title") as string) || "").trim();
    const body = ((formData.get("body") as string) || "").trim();
    const publishedAtRaw = (formData.get("publishedAt") as string) || null;

    if (!title) {
      return { success: false, error: "El título es obligatorio." };
    }
    if (!body) {
      return { success: false, error: "El contenido de la noticia es obligatorio." };
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
      imagePath = await saveUploadedFile(buffer, "news", validation.ext!);
    }

    const post = await prisma.newsPost.create({
      data: {
        title,
        body,
        imagePath,
        publishedAt: publishedAtRaw ? new Date(publishedAtRaw) : new Date(),
      },
    });

    revalidatePath("/admin/news");
    revalidatePath("/news");

    return {
      success: true,
      message: "Noticia publicada con éxito.",
      newsId: post.id,
    };
  } catch (err: unknown) {
    console.error("Error al crear noticia:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Update an existing news post
 */
export async function updateNewsAction(
  formData: FormData
): Promise<NewsActionResult> {
  try {
    await requireAdmin();

    const id = (formData.get("id") as string) || "";
    const title = ((formData.get("title") as string) || "").trim();
    const body = ((formData.get("body") as string) || "").trim();
    const publishedAtRaw = (formData.get("publishedAt") as string) || null;

    if (!id) {
      return { success: false, error: "ID de la noticia no proporcionado." };
    }
    if (!title) {
      return { success: false, error: "El título es obligatorio." };
    }
    if (!body) {
      return { success: false, error: "El contenido de la noticia es obligatorio." };
    }

    const existing = await prisma.newsPost.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: "Noticia no encontrada." };
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
      await deleteUploadedFile(existing.imagePath);
      imagePath = await saveUploadedFile(buffer, "news", validation.ext!);
    }

    await prisma.newsPost.update({
      where: { id },
      data: {
        title,
        body,
        imagePath,
        publishedAt: publishedAtRaw ? new Date(publishedAtRaw) : existing.publishedAt,
      },
    });

    revalidatePath("/admin/news");
    revalidatePath("/news");

    return { success: true, message: "Noticia actualizada con éxito." };
  } catch (err: unknown) {
    console.error("Error al actualizar noticia:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Delete a news post
 */
export async function deleteNewsAction(
  id: string
): Promise<NewsActionResult> {
  try {
    await requireAdmin();

    const post = await prisma.newsPost.findUnique({ where: { id } });
    if (!post) {
      return { success: false, error: "Noticia no encontrada." };
    }

    await deleteUploadedFile(post.imagePath);
    await prisma.newsPost.delete({ where: { id } });

    revalidatePath("/admin/news");
    revalidatePath("/news");

    return { success: true, message: "Noticia eliminada." };
  } catch (err: unknown) {
    console.error("Error al eliminar noticia:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Toggle news publish state
 */
export async function toggleNewsAction(
  id: string
): Promise<NewsActionResult> {
  try {
    await requireAdmin();

    const post = await prisma.newsPost.findUnique({ where: { id } });
    if (!post) {
      return { success: false, error: "Noticia no encontrada." };
    }

    await prisma.newsPost.update({
      where: { id },
      data: { isPublished: !post.isPublished },
    });

    revalidatePath("/admin/news");
    revalidatePath("/news");

    return {
      success: true,
      message: post.isPublished ? "Noticia despublicada." : "Noticia publicada.",
    };
  } catch (err: unknown) {
    console.error("Error al cambiar estado de noticia:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}
