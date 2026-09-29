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

export interface SettingsActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Update general store settings
 */
export async function updateSettingsAction(
  settings: Record<string, string>
): Promise<SettingsActionResult> {
  try {
    await requireAdmin();

    for (const [key, value] of Object.entries(settings)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/orders");

    return {
      success: true,
      message: "Configuración guardada con éxito.",
    };
  } catch (err: unknown) {
    console.error("Error al guardar configuración:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Create or update a message template
 */
export async function saveMessageTemplateAction(
  formData: FormData
): Promise<SettingsActionResult> {
  try {
    await requireAdmin();

    const id = formData.get("id") as string | null;
    const name = ((formData.get("name") as string) || "").trim();
    const body = ((formData.get("body") as string) || "").trim();

    if (!name) {
      return { success: false, error: "El identificador de la plantilla es obligatorio." };
    }
    if (!body) {
      return { success: false, error: "El cuerpo del mensaje no puede estar vacío." };
    }

    if (id) {
      await prisma.messageTemplate.update({
        where: { id },
        data: { name, body },
      });
    } else {
      await prisma.messageTemplate.create({
        data: { name, body },
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath("/admin/whatsapp");

    return {
      success: true,
      message: "Plantilla guardada con éxito.",
    };
  } catch (err: unknown) {
    console.error("Error al guardar plantilla:", err);
    const message = err instanceof Error ? err.message : "Error al guardar plantilla.";
    return { success: false, error: message };
  }
}

/**
 * Delete a message template
 */
export async function deleteMessageTemplateAction(
  id: string
): Promise<SettingsActionResult> {
  try {
    await requireAdmin();

    await prisma.messageTemplate.delete({
      where: { id },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin/whatsapp");

    return {
      success: true,
      message: "Plantilla eliminada con éxito.",
    };
  } catch (err: unknown) {
    console.error("Error al eliminar plantilla:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Log a WhatsApp contact attempt
 */
export async function logWhatsAppContactAction(
  userId: string,
  orderItemId: string | null,
  message: string
): Promise<SettingsActionResult> {
  try {
    const admin = await requireAdmin();

    await prisma.whatsAppContactLog.create({
      data: {
        userId,
        adminId: admin.userId,
        orderItemId: orderItemId || null,
        message,
      },
    });

    revalidatePath("/admin/whatsapp");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error al registrar contacto de WhatsApp:", err);
    const message = err instanceof Error ? err.message : "Error al registrar contacto.";
    return { success: false, error: message };
  }
}
