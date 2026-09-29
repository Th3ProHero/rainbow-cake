"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  ALLOWED_PAYMENT_MIMES,
  validateFileContent,
  saveUploadedFile,
  deleteUploadedFile,
} from "@/lib/files";
import { queueEmail } from "@/lib/email/queue";
import { baseEmailTemplate } from "@/lib/email/templates";
import { formatCurrency } from "@/lib/utils";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("No tienes permisos de administrador.");
  }
  return session;
}

export interface AdminPaymentResult {
  success: boolean;
  error?: string;
  paymentId?: string;
  message?: string;
}

/**
 * Register a payment as admin
 */
export async function createAdminPaymentAction(
  formData: FormData
): Promise<AdminPaymentResult> {
  try {
    const admin = await requireAdmin();

    const userId = formData.get("userId") as string;
    if (!userId) {
      return { success: false, error: "Debes seleccionar un cliente." };
    }

    const amountRaw = formData.get("amount") as string;
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Introduce un monto válido mayor a 0." };
    }

    const method = ((formData.get("method") as string) || "TRANSFER").trim();
    const reference = ((formData.get("reference") as string) || "").trim();
    const note = ((formData.get("note") as string) || "").trim();
    const paidAtRaw = formData.get("paidAt") as string;
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

    const file = formData.get("receipt") as File | null;
    let filePath: string | null = null;
    let mimeType: string | null = null;
    let originalName: string | null = null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = await validateFileContent(buffer, ALLOWED_PAYMENT_MIMES);
      if (!validation.valid || !validation.ext) {
        return {
          success: false,
          error: validation.error || "Formato de archivo inválido. Solo JPG, PNG y PDF.",
        };
      }

      filePath = await saveUploadedFile(buffer, "payments", validation.ext);
      mimeType = validation.mime || null;
      originalName = file.name;
    }

    const payment = await prisma.payment.create({
      data: {
        userId,
        uploadedById: admin.userId,
        paidAt,
        amount,
        method,
        reference: reference || null,
        note: note || null,
        filePath,
        mimeType,
        originalName,
      },
      include: {
        user: true,
      },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin/items");
    revalidatePath("/orders");

    return {
      success: true,
      paymentId: payment.id,
      message: `Pago de ${formatCurrency(amount)} registrado con éxito para ${payment.user.name}.`,
    };
  } catch (err: unknown) {
    console.error("Error al registrar pago admin:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

export interface AllocationItemInput {
  orderItemId: string;
  amountApplied: number;
}

/**
 * Allocate payment amount to user's order items
 */
export async function allocatePaymentAction(
  paymentId: string,
  allocations: AllocationItemInput[]
): Promise<AdminPaymentResult> {
  try {
    await requireAdmin();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: true,
      },
    });

    if (!payment) {
      return { success: false, error: "Pago no encontrado." };
    }

    const paymentAmount = Number(payment.amount || 0);

    // Filter valid allocations
    const activeAllocations = allocations.filter((a) => a.amountApplied > 0);
    const totalAllocated = activeAllocations.reduce(
      (sum, a) => sum + a.amountApplied,
      0
    );

    // Check that total allocated doesn't exceed payment amount
    if (paymentAmount > 0 && Math.round(totalAllocated * 100) > Math.round(paymentAmount * 100)) {
      return {
        success: false,
        error: `La suma de asignaciones (${formatCurrency(totalAllocated)}) no puede superar el monto del pago (${formatCurrency(paymentAmount)}).`,
      };
    }

    // Apply allocations in transaction
    await prisma.$transaction(async (tx) => {
      // Remove existing allocations for this payment
      await tx.paymentAllocation.deleteMany({
        where: { paymentId: payment.id },
      });

      // Insert new allocations
      for (const alloc of activeAllocations) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            orderItemId: alloc.orderItemId,
            amountApplied: alloc.amountApplied,
          },
        });
      }
    });

    // Notify user of payment applied
    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const emailHtml = baseEmailTemplate({
      title: "Comprobante de pago aplicado 💳",
      previewText: `Hemos acreditado tu pago de ${formatCurrency(totalAllocated)}.`,
      childrenHtml: `
        <p>¡Hola <strong>${payment.user.name}</strong>!</p>
        <p>Hemos aplicado <strong>${formatCurrency(totalAllocated)}</strong> de tu comprobante a tus artículos correspondientes.</p>
        <p>Puedes consultar tu saldo actualizado y el desglose de cada artículo desde tu panel de pedidos.</p>
      `,
      ctaButton: {
        text: "Ver mis pedidos",
        url: `${appUrl}/orders`,
      },
    });

    await queueEmail({
      type: "PAYMENT_ALLOCATED",
      toEmail: payment.user.email,
      subject: `Abono de pago acreditado — Rainbow Cake GO`,
      html: emailHtml,
      relatedUserId: payment.user.id,
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin/items");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Se asignaron ${formatCurrency(totalAllocated)} a los artículos seleccionados.`,
    };
  } catch (err: unknown) {
    console.error("Error al asignar pago:", err);
    const message = err instanceof Error ? err.message : "Error inesperado al asignar pago.";
    return { success: false, error: message };
  }
}

/**
 * Delete a payment record and its associated file
 */
export async function deletePaymentAction(
  paymentId: string
): Promise<AdminPaymentResult> {
  try {
    await requireAdmin();

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, error: "Pago no encontrado." };
    }

    // Delete uploaded file if any
    if (payment.filePath) {
      await deleteUploadedFile(payment.filePath);
    }

    // Delete in cascade: allocations first then payment
    await prisma.$transaction([
      prisma.paymentAllocation.deleteMany({ where: { paymentId } }),
      prisma.payment.delete({ where: { id: paymentId } }),
    ]);

    revalidatePath("/admin/payments");
    revalidatePath("/admin/items");
    revalidatePath("/orders");

    return { success: true, message: "Pago eliminado con éxito." };
  } catch (err: unknown) {
    console.error("Error al eliminar pago:", err);
    const message = err instanceof Error ? err.message : "Error al eliminar pago.";
    return { success: false, error: message };
  }
}

/**
 * Mark one or multiple order items as paid, optionally attaching a receipt photo/PDF
 */
export async function markItemsAsPaidAction(
  formData: FormData
): Promise<AdminPaymentResult> {
  try {
    const admin = await requireAdmin();

    const userId = formData.get("userId") as string;
    const itemIdsRaw = formData.get("itemIds") as string;
    if (!userId || !itemIdsRaw) {
      return { success: false, error: "Datos de usuario y artículos incompletos." };
    }

    const itemIds = JSON.parse(itemIdsRaw) as string[];
    if (!itemIds || itemIds.length === 0) {
      return { success: false, error: "Selecciona al menos un artículo." };
    }

    const method = ((formData.get("method") as string) || "Transferencia").trim();
    const reference = ((formData.get("reference") as string) || "").trim();
    const note = ((formData.get("note") as string) || "").trim();
    const paidAtRaw = formData.get("paidAt") as string;
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : new Date();

    const file = formData.get("receipt") as File | null;
    let filePath: string | null = null;
    let mimeType: string | null = null;
    let originalName: string | null = null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = await validateFileContent(buffer, ALLOWED_PAYMENT_MIMES);
      if (!validation.valid || !validation.ext) {
        return {
          success: false,
          error: validation.error || "Formato de archivo inválido. Solo JPG, PNG y PDF.",
        };
      }

      filePath = await saveUploadedFile(buffer, "payments", validation.ext);
      mimeType = validation.mime || null;
      originalName = file.name;
    }

    // Fetch the target items to calculate amounts
    const items = await prisma.orderItem.findMany({
      where: {
        id: { in: itemIds },
        order: { userId },
      },
      include: {
        allocations: true,
      },
    });

    if (items.length === 0) {
      return { success: false, error: "No se encontraron los artículos indicados." };
    }

    // Compute remaining balance for each item
    const itemAmounts: { itemId: string; amountToApply: number }[] = [];
    let totalPaymentAmount = 0;

    for (const item of items) {
      const due = Number(item.snapshotUnitPrice) * (item.quantity - item.quantityCancelled);
      const paid = item.allocations.reduce((sum, a) => sum + Number(a.amountApplied), 0);
      const remaining = Math.max(0, due - paid);

      const toApply = remaining > 0 ? remaining : Number(item.snapshotUnitPrice) * item.quantity;
      if (toApply > 0) {
        itemAmounts.push({ itemId: item.id, amountToApply: toApply });
        totalPaymentAmount += toApply;
      }
    }

    if (totalPaymentAmount <= 0) {
      return { success: false, error: "Los artículos seleccionados ya no tienen saldo pendiente." };
    }

    // Create payment and allocations in transaction
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId,
          uploadedById: admin.userId,
          paidAt,
          amount: totalPaymentAmount,
          method,
          reference: reference || null,
          note: note || (items.length > 1 ? `Pago de ${items.length} artículos` : `Pago de ${items[0].snapshotName}`),
          filePath,
          mimeType,
          originalName,
        },
      });

      for (const itemAlloc of itemAmounts) {
        await tx.paymentAllocation.create({
          data: {
            paymentId: payment.id,
            orderItemId: itemAlloc.itemId,
            amountApplied: itemAlloc.amountToApply,
          },
        });
      }
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/items");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");

    return {
      success: true,
      message: `${items.length} artículo(s) marcado(s) como pagado(s) (${formatCurrency(totalPaymentAmount)}).`,
    };
  } catch (err: unknown) {
    console.error("Error al marcar artículos como pagados:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Unmark payment for one or multiple order items (removes allocations)
 */
export async function unmarkItemsPaymentAction(
  itemIds: string[]
): Promise<AdminPaymentResult> {
  try {
    await requireAdmin();

    if (!itemIds || itemIds.length === 0) {
      return { success: false, error: "Selecciona al menos un artículo para desmarcar pago." };
    }

    const deleteResult = await prisma.paymentAllocation.deleteMany({
      where: {
        orderItemId: { in: itemIds },
      },
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/items");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Se desmarcó el pago de ${deleteResult.count} asignación(es).`,
    };
  } catch (err: unknown) {
    console.error("Error al desmarcar pago de artículos:", err);
    const message = err instanceof Error ? err.message : "Error inesperado.";
    return { success: false, error: message };
  }
}

/**
 * Edit an existing payment's metadata and/or receipt file
 */
export async function editPaymentAction(
  formData: FormData
): Promise<AdminPaymentResult> {
  try {
    await requireAdmin();

    const paymentId = formData.get("paymentId") as string;
    if (!paymentId) {
      return { success: false, error: "ID de pago requerido." };
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { success: false, error: "Pago no encontrado." };
    }

    const amountRaw = formData.get("amount") as string;
    const amount = parseFloat(amountRaw);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Introduce un monto válido mayor a 0." };
    }

    const method = ((formData.get("method") as string) || "Transferencia").trim();
    const reference = ((formData.get("reference") as string) || "").trim();
    const note = ((formData.get("note") as string) || "").trim();
    const paidAtRaw = formData.get("paidAt") as string;
    const paidAt = paidAtRaw ? new Date(paidAtRaw) : payment.paidAt;

    const file = formData.get("receipt") as File | null;
    let filePath = payment.filePath;
    let mimeType = payment.mimeType;
    let originalName = payment.originalName;

    // Handle new receipt file upload
    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = await validateFileContent(buffer, ALLOWED_PAYMENT_MIMES);
      if (!validation.valid || !validation.ext) {
        return {
          success: false,
          error: validation.error || "Formato de archivo inválido. Solo JPG, PNG y PDF.",
        };
      }

      // Delete old file if exists
      if (payment.filePath) {
        await deleteUploadedFile(payment.filePath);
      }

      filePath = await saveUploadedFile(buffer, "payments", validation.ext);
      mimeType = validation.mime || null;
      originalName = file.name;
    }

    // Handle explicit receipt removal
    const removeReceipt = formData.get("removeReceipt") === "true";
    if (removeReceipt && payment.filePath) {
      await deleteUploadedFile(payment.filePath);
      filePath = null;
      mimeType = null;
      originalName = null;
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount,
        method,
        reference: reference || null,
        note: note || null,
        paidAt,
        filePath,
        mimeType,
        originalName,
      },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin/users");
    revalidatePath("/admin/items");
    revalidatePath("/orders");

    return {
      success: true,
      paymentId,
      message: `Pago actualizado con éxito (${formatCurrency(amount)}).`,
    };
  } catch (err: unknown) {
    console.error("Error al editar pago:", err);
    const message = err instanceof Error ? err.message : "Error inesperado al editar pago.";
    return { success: false, error: message };
  }
}

/**
 * Request a return for one or multiple order items of a user
 */
export async function requestReturnAction(
  userId: string,
  itemIds: string[],
  reason?: string
): Promise<AdminPaymentResult> {
  try {
    await requireAdmin();

    if (!userId) {
      return { success: false, error: "ID de usuario requerido." };
    }

    if (!itemIds || itemIds.length === 0) {
      return { success: false, error: "Selecciona al menos un artículo para devolución." };
    }

    // Verify items belong to user
    const items = await prisma.orderItem.findMany({
      where: {
        id: { in: itemIds },
        order: { userId },
      },
      include: {
        allocations: true,
      },
    });

    if (items.length === 0) {
      return { success: false, error: "No se encontraron los artículos indicados para este usuario." };
    }

    // Calculate refund amounts (what was paid for each item)
    const returnData = items.map((item) => {
      const paid = item.allocations.reduce(
        (sum, a) => sum + Number(a.amountApplied),
        0
      );
      return {
        orderItemId: item.id,
        refundAmount: paid > 0 ? paid : Number(item.snapshotUnitPrice) * item.quantity,
      };
    });

    const createdReturn = await prisma.return.create({
      data: {
        userId,
        status: "REQUESTED",
        reason: reason?.trim() || null,
        items: {
          create: returnData.map((rd) => ({
            orderItemId: rd.orderItemId,
            refundAmount: rd.refundAmount,
          })),
        },
      },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        user: true,
      },
    });

    const totalRefund = returnData.reduce((sum, rd) => sum + rd.refundAmount, 0);

    revalidatePath("/admin/users");
    revalidatePath("/admin/items");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Devolución solicitada para ${items.length} artículo(s) (${formatCurrency(totalRefund)}). ID: ${createdReturn.id.slice(-6).toUpperCase()}`,
    };
  } catch (err: unknown) {
    console.error("Error al solicitar devolución:", err);
    const message = err instanceof Error ? err.message : "Error inesperado al solicitar devolución.";
    return { success: false, error: message };
  }
}

/**
 * Complete a return, uploading an optional receipt
 */
export async function completeReturnAction(
  formData: FormData
): Promise<AdminPaymentResult> {
  try {
    const admin = await requireAdmin();

    const returnId = formData.get("returnId") as string;
    if (!returnId) {
      return { success: false, error: "ID de devolución requerido." };
    }

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: {
        items: {
          include: {
            orderItem: true,
          },
        },
        user: true,
      },
    });

    if (!returnRecord) {
      return { success: false, error: "Devolución no encontrada." };
    }

    if (returnRecord.status === "COMPLETED") {
      return { success: false, error: "Esta devolución ya fue completada." };
    }

    // Handle receipt file
    const file = formData.get("receipt") as File | null;
    let receiptFilePath: string | null = null;
    let receiptMimeType: string | null = null;
    let receiptOriginalName: string | null = null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const validation = await validateFileContent(buffer, ALLOWED_PAYMENT_MIMES);
      if (!validation.valid || !validation.ext) {
        return {
          success: false,
          error: validation.error || "Formato de archivo inválido. Solo JPG, PNG y PDF.",
        };
      }

      receiptFilePath = await saveUploadedFile(buffer, "returns", validation.ext);
      receiptMimeType = validation.mime || null;
      receiptOriginalName = file.name;
    }

    // Mark return as completed and update items in transaction
    await prisma.$transaction(async (tx) => {
      await tx.return.update({
        where: { id: returnId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          receiptFilePath,
          receiptMimeType,
          receiptOriginalName,
        },
      });

      for (const ri of returnRecord.items) {
        await tx.orderItem.update({
          where: { id: ri.orderItemId },
          data: {
            status: "CANCELLED",
            quantityCancelled: ri.orderItem.quantity,
          },
        });

        await tx.orderItemLog.create({
          data: {
            orderItemId: ri.orderItemId,
            fromStatus: ri.orderItem.status,
            toStatus: "CANCELLED",
            note: `Devolución completada (Reembolso: ${formatCurrency(Number(ri.refundAmount))})`,
            changedById: admin.userId,
          },
        });
      }
    });

    // Notify user about completed return
    const user = returnRecord.user;
    const totalRefund = returnRecord.items.reduce(
      (sum, ri) => sum + Number(ri.refundAmount),
      0
    );
    const itemListHtml = returnRecord.items
      .map((ri) => `<li><strong>${ri.orderItem.snapshotName}</strong> (${ri.orderItem.snapshotSku}) — Reembolso: ${formatCurrency(Number(ri.refundAmount))}</li>`)
      .join("");

    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const emailHtml = baseEmailTemplate({
      title: "Devolución completada ✅",
      previewText: `Tu devolución de ${formatCurrency(totalRefund)} ha sido completada.`,
      childrenHtml: `
        <p>¡Hola <strong>${user.name}</strong>!</p>
        <p>Te confirmamos que tu devolución ha sido procesada exitosamente:</p>
        <ul>${itemListHtml}</ul>
        <p><strong>Total reembolsado: ${formatCurrency(totalRefund)}</strong></p>
        ${receiptFilePath ? "<p>Se ha adjuntado un comprobante de reembolso que puedes consultar en tu panel.</p>" : ""}
      `,
      ctaButton: {
        text: "Ver mis pedidos",
        url: `${appUrl}/orders`,
      },
    });

    await queueEmail({
      type: "RETURN_COMPLETED",
      toEmail: user.email,
      subject: `Devolución completada — Rainbow Cake GO`,
      html: emailHtml,
      relatedUserId: user.id,
    });

    revalidatePath("/admin/users");
    revalidatePath("/admin/items");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Devolución completada. Reembolso total: ${formatCurrency(totalRefund)}.`,
    };
  } catch (err: unknown) {
    console.error("Error al completar devolución:", err);
    const message = err instanceof Error ? err.message : "Error inesperado al completar devolución.";
    return { success: false, error: message };
  }
}

/**
 * Cancel/delete a pending return request
 */
export async function cancelReturnAction(
  returnId: string
): Promise<AdminPaymentResult> {
  try {
    await requireAdmin();

    if (!returnId) {
      return { success: false, error: "ID de devolución requerido." };
    }

    const returnRecord = await prisma.return.findUnique({
      where: { id: returnId },
      include: { items: true },
    });

    if (!returnRecord) {
      return { success: false, error: "Devolución no encontrada." };
    }

    if (returnRecord.status === "COMPLETED") {
      return { success: false, error: "No se puede cancelar una devolución ya completada." };
    }

    // Delete return items first, then the return
    await prisma.$transaction([
      prisma.returnItem.deleteMany({ where: { returnId } }),
      prisma.return.delete({ where: { id: returnId } }),
    ]);

    revalidatePath("/admin/users");
    revalidatePath("/admin/items");
    revalidatePath("/admin/payments");
    revalidatePath("/orders");

    return {
      success: true,
      message: "Solicitud de devolución cancelada.",
    };
  } catch (err: unknown) {
    console.error("Error al cancelar devolución:", err);
    const message = err instanceof Error ? err.message : "Error al cancelar devolución.";
    return { success: false, error: message };
  }
}

