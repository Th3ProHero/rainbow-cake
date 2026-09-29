"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ALLOWED_PAYMENT_MIMES,
  validateFileContent,
  saveUploadedFile,
} from "@/lib/files";
import { queueEmail } from "@/lib/email/queue";
import { baseEmailTemplate } from "@/lib/email/templates";
import { formatCurrency } from "@/lib/utils";

export interface UploadPaymentResult {
  success: boolean;
  error?: string;
  paymentId?: string;
}

/**
 * Upload a payment receipt by regular user
 */
export async function uploadUserPaymentAction(
  formData: FormData
): Promise<UploadPaymentResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Debes iniciar sesión para subir un comprobante." };
    }

    const file = formData.get("receipt") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "Selecciona un archivo de comprobante (JPG, PNG o PDF)." };
    }

    const amountRaw = formData.get("amount") as string;
    const amount = amountRaw ? parseFloat(amountRaw) : null;
    if (amount !== null && (isNaN(amount) || amount <= 0)) {
      return { success: false, error: "Introduce un monto válido mayor a 0." };
    }

    const method = ((formData.get("method") as string) || "TRANSFER").trim();
    const reference = ((formData.get("reference") as string) || "").trim();
    const note = ((formData.get("note") as string) || "").trim();
    const paidAtRaw = formData.get("paidAt") as string;
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

    // Validate magic bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = await validateFileContent(buffer, ALLOWED_PAYMENT_MIMES);
    if (!validation.valid || !validation.ext) {
      return {
        success: false,
        error: validation.error || "Formato de archivo inválido. Solo JPG, PNG y PDF.",
      };
    }

    // Save file
    const filePath = await saveUploadedFile(buffer, "payments", validation.ext);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, name: true, email: true, whatsapp: true },
    });

    if (!user) {
      return { success: false, error: "Usuario no encontrado." };
    }

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        uploadedById: user.id,
        paidAt,
        amount: amount !== null ? amount : null,
        method,
        reference: reference || null,
        note: note || null,
        filePath,
        mimeType: validation.mime,
        originalName: file.name,
      },
    });

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFY_EMAILS || process.env.ADMIN_SEED_EMAIL;
    if (adminEmail) {
      const appUrl = process.env.APP_URL || "http://localhost:18473";
      const adminEmailHtml = baseEmailTemplate({
        title: "Nuevo comprobante de pago recibido 💳",
        previewText: `${user.name} subió un nuevo comprobante de pago.`,
        childrenHtml: `
          <p>El cliente <strong>${user.name}</strong> (${user.whatsapp}) ha subido un nuevo comprobante:</p>
          <ul>
            <li><strong>Monto reportado:</strong> ${amount !== null ? formatCurrency(amount) : "No especificado"}</li>
            <li><strong>Método:</strong> ${method}</li>
            ${reference ? `<li><strong>Referencia:</strong> ${reference}</li>` : ""}
            ${note ? `<li><strong>Nota:</strong> ${note}</li>` : ""}
          </ul>
          <p>Ingresa al panel admin para verificar el comprobante y asignarlo a los artículos correspondientes.</p>
        `,
        ctaButton: {
          text: "Ver pagos en panel admin",
          url: `${appUrl}/admin/payments`,
        },
      });

      await queueEmail({
        type: "PAYMENT_RECEIPT_UPLOADED",
        toEmail: adminEmail,
        subject: `Nuevo comprobante de pago de ${user.name}`,
        html: adminEmailHtml,
        relatedUserId: user.id,
      });
    }

    revalidatePath("/orders");
    revalidatePath("/admin/payments");

    return {
      success: true,
      paymentId: payment.id,
    };
  } catch (err: unknown) {
    console.error("Error al subir comprobante de pago:", err);
    const message = err instanceof Error ? err.message : "Error inesperado al subir comprobante.";
    return { success: false, error: message };
  }
}
