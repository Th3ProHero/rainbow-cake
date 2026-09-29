"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("No tienes permisos de administrador.");
  }
  return session;
}

export interface UserActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Update internal admin notes for a customer
 */
export async function updateUserNotesAction(
  userId: string,
  internalNotes: string
): Promise<UserActionResult> {
  try {
    await requireAdmin();

    await prisma.user.update({
      where: { id: userId },
      data: { internalNotes: internalNotes.trim() || null },
    });

    revalidatePath("/admin/users");

    return { success: true, message: "Notas internas actualizadas." };
  } catch (err: unknown) {
    console.error("Error al actualizar notas de usuario:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Toggle user active/inactive status
 */
export async function toggleUserStatusAction(
  userId: string
): Promise<UserActionResult> {
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    if (user.role === "ADMIN") {
      return { success: false, error: "No puedes desactivar a un administrador." };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
    });

    revalidatePath("/admin/users");

    return {
      success: true,
      message: `Usuario ${updated.isActive ? "activado" : "desactivado"} con éxito.`,
    };
  } catch (err: unknown) {
    console.error("Error al cambiar estado de usuario:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}
