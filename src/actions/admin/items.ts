"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { applyDelivery } from "@/lib/domain/order-item";
import { ORDER_ITEM_STATUS_LABELS } from "@/lib/constants";
import { queueEmail } from "@/lib/email/queue";
import { baseEmailTemplate } from "@/lib/email/templates";
import type { OrderItemStatus } from "@prisma/client";

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("No tienes permisos de administrador.");
  }
  return session;
}

export interface ItemActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Update the status of a single order item
 */
export async function updateOrderItemStatusAction(
  orderItemId: string,
  newStatus: OrderItemStatus,
  note?: string
): Promise<ItemActionResult> {
  try {
    const admin = await requireAdmin();

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Artículo no encontrado." };
    }

    if (item.status === newStatus) {
      return { success: true, message: "El artículo ya tenía este estado." };
    }

    const previousStatus = item.status;
    let newDelivered = item.quantityDelivered;
    let newCancelled = item.quantityCancelled;

    // Adjust quantities if entering terminal statuses
    if (newStatus === "DELIVERED") {
      newDelivered = item.quantity - item.quantityCancelled;
    } else if (newStatus === "CANCELLED") {
      newCancelled = item.quantity - item.quantityDelivered;
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: newStatus,
          quantityDelivered: newDelivered,
          quantityCancelled: newCancelled,
        },
      });

      await tx.orderItemLog.create({
        data: {
          orderItemId: item.id,
          fromStatus: previousStatus,
          toStatus: newStatus,
          deliveredDelta: 0,
          changedById: admin.userId,
          note: note?.trim() || `Estado cambiado a ${ORDER_ITEM_STATUS_LABELS[newStatus]} por el administrador`,
        },
      });
    });

    // Send email notification to user
    const user = item.order.user;
    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const statusLabel = ORDER_ITEM_STATUS_LABELS[newStatus];

    let emailSubject = `Actualización de tu pedido ${item.order.code}: ${item.snapshotName}`;
    let emailHeading = `Tu artículo ahora está: ${statusLabel}`;
    let messageBody = `<p>El estado del artículo <strong>${item.snapshotName}</strong> (${item.snapshotSku}) del pedido <strong>${item.order.code}</strong> ha cambiado a <strong>${statusLabel}</strong>.</p>`;

    if (newStatus === "IN_WAREHOUSE") {
      emailHeading = `¡Tu artículo ya está en almacén! 📦`;
      messageBody += `<p>Ya puedes ponerte en contacto con nosotros vía WhatsApp para coordinar el día y lugar de tu entrega personal.</p>`;
    } else if (newStatus === "IN_TRANSIT") {
      emailHeading = `Tu artículo va en camino ✈️`;
      messageBody += `<p>El artículo ya está en tránsito hacia nuestro almacén. Te notificaremos en cuanto llegue para coordinar tu entrega.</p>`;
    } else if (newStatus === "DELIVERED") {
      emailHeading = `¡Artículo entregado con éxito! 🎉`;
      messageBody += `<p>Se ha registrado la entrega de este artículo. ¡Muchas gracias por tu compra!</p>`;
    }

    if (note?.trim()) {
      messageBody += `<div style="background-color: #FFF6F9; border-left: 3px solid #D12F6A; padding: 10px 14px; margin-top: 12px; font-size: 13px; color: #5C4A54;"><strong>Nota del administrador:</strong> ${note.trim()}</div>`;
    }

    const emailHtml = baseEmailTemplate({
      title: emailHeading,
      previewText: `Tu artículo ${item.snapshotName} ahora está: ${statusLabel}`,
      childrenHtml: messageBody,
      ctaButton: {
        text: "Ver mis pedidos",
        url: `${appUrl}/orders`,
      },
    });

    await queueEmail({
      type: "ITEM_STATUS_CHANGED",
      toEmail: user.email,
      subject: emailSubject,
      html: emailHtml,
      relatedOrderId: item.order.id,
      relatedUserId: user.id,
    });

    revalidatePath("/admin/items");
    revalidatePath("/admin");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Artículo actualizado a "${statusLabel}".`,
    };
  } catch (err: unknown) {
    console.error("Error al actualizar estado del artículo:", err);
    const message = err instanceof Error ? err.message : "Error al actualizar estado.";
    return { success: false, error: message };
  }
}

/**
 * Record a partial (or full) delivery of pieces for an item
 */
export async function recordPartialDeliveryAction(
  orderItemId: string,
  deliveredDelta: number,
  note?: string
): Promise<ItemActionResult> {
  try {
    const admin = await requireAdmin();

    if (isNaN(deliveredDelta) || deliveredDelta <= 0) {
      return { success: false, error: "La cantidad entregada debe ser mayor a 0." };
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Artículo no encontrado." };
    }

    const deliveryResult = applyDelivery(
      {
        quantity: item.quantity,
        quantityDelivered: item.quantityDelivered,
        quantityCancelled: item.quantityCancelled,
        status: item.status,
      },
      deliveredDelta
    );

    if (deliveryResult.error) {
      return { success: false, error: deliveryResult.error };
    }

    const previousStatus = item.status;

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: deliveryResult.status,
          quantityDelivered: deliveryResult.quantityDelivered,
        },
      });

      await tx.orderItemLog.create({
        data: {
          orderItemId: item.id,
          fromStatus: previousStatus,
          toStatus: deliveryResult.status,
          deliveredDelta: deliveredDelta,
          changedById: admin.userId,
          note: note?.trim() || `Entrega de ${deliveredDelta} pieza(s) registrada`,
        },
      });
    });

    // Notify user
    const user = item.order.user;
    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const statusLabel = ORDER_ITEM_STATUS_LABELS[deliveryResult.status];

    const emailHtml = baseEmailTemplate({
      title: `Entrega de artículo registrada (${deliveredDelta} pza${deliveredDelta > 1 ? "s" : ""})`,
      previewText: `Se registraron ${deliveredDelta} piezas entregadas de ${item.snapshotName}`,
      childrenHtml: `
        <p>¡Hola <strong>${user.name}</strong>!</p>
        <p>Se ha registrado la entrega de <strong>${deliveredDelta} pieza(s)</strong> del artículo <strong>${item.snapshotName}</strong> de tu pedido <strong>${item.order.code}</strong>.</p>
        <p>Total entregado hasta ahora: <strong>${deliveryResult.quantityDelivered} de ${item.quantity}</strong> piezas.</p>
        <p>Estado actual: <strong>${statusLabel}</strong>.</p>
        ${note?.trim() ? `<div style="background-color: #FFF6F9; border-left: 3px solid #D12F6A; padding: 10px 14px; margin-top: 12px; font-size: 13px; color: #5C4A54;"><strong>Nota:</strong> ${note.trim()}</div>` : ""}
      `,
      ctaButton: {
        text: "Ver mis pedidos",
        url: `${appUrl}/orders`,
      },
    });

    await queueEmail({
      type: "ITEM_DELIVERY_RECORDED",
      toEmail: user.email,
      subject: `Entrega de piezas registrada en pedido ${item.order.code}`,
      html: emailHtml,
      relatedOrderId: item.order.id,
      relatedUserId: user.id,
    });

    revalidatePath("/admin/items");
    revalidatePath("/admin");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Se registraron ${deliveredDelta} pieza(s) entregada(s).`,
    };
  } catch (err: unknown) {
    console.error("Error al registrar entrega parcial:", err);
    const message = err instanceof Error ? err.message : "Error al registrar entrega.";
    return { success: false, error: message };
  }
}

/**
 * Batch update status for multiple order items
 */
export async function batchUpdateItemStatusAction(
  orderItemIds: string[],
  newStatus: OrderItemStatus,
  note?: string
): Promise<ItemActionResult> {
  try {
    const admin = await requireAdmin();

    if (!orderItemIds || orderItemIds.length === 0) {
      return { success: false, error: "Selecciona al menos un artículo." };
    }

    const items = await prisma.orderItem.findMany({
      where: { id: { in: orderItemIds } },
      include: {
        order: {
          include: {
            user: true,
          },
        },
      },
    });

    if (items.length === 0) {
      return { success: false, error: "No se encontraron los artículos seleccionados." };
    }

    // Process all updates in transaction
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.status === newStatus) continue;

        let newDelivered = item.quantityDelivered;
        let newCancelled = item.quantityCancelled;

        if (newStatus === "DELIVERED") {
          newDelivered = item.quantity - item.quantityCancelled;
        } else if (newStatus === "CANCELLED") {
          newCancelled = item.quantity - item.quantityDelivered;
        }

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            status: newStatus,
            quantityDelivered: newDelivered,
            quantityCancelled: newCancelled,
          },
        });

        await tx.orderItemLog.create({
          data: {
            orderItemId: item.id,
            fromStatus: item.status,
            toStatus: newStatus,
            deliveredDelta: 0,
            changedById: admin.userId,
            note: note?.trim() || `Actualización masiva a ${ORDER_ITEM_STATUS_LABELS[newStatus]}`,
          },
        });
      }
    });

    // Group items by user to send consolidated notification emails
    const itemsByUser = new Map<string, { user: { name: string; email: string }; items: typeof items }>();
    for (const item of items) {
      const u = item.order.user;
      if (!itemsByUser.has(u.id)) {
        itemsByUser.set(u.id, { user: u, items: [] });
      }
      itemsByUser.get(u.id)!.items.push(item);
    }

    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const statusLabel = ORDER_ITEM_STATUS_LABELS[newStatus];

    for (const [userId, group] of itemsByUser.entries()) {
      const user = group.user;
      const itemListHtml = group.items
        .map((i) => `<li><strong>${i.snapshotName}</strong> (${i.snapshotSku}) — Pedido ${i.order.code}</li>`)
        .join("");

      const emailHtml = baseEmailTemplate({
        title: `Actualización de tus artículos: ${statusLabel}`,
        previewText: `${group.items.length} artículo(s) ahora están: ${statusLabel}`,
        childrenHtml: `
          <p>¡Hola <strong>${user.name}</strong>!</p>
          <p>Los siguientes artículos de tus pedidos han cambiado de estado a <strong>${statusLabel}</strong>:</p>
          <ul>
            ${itemListHtml}
          </ul>
          ${newStatus === "IN_WAREHOUSE" ? "<p>Ya puedes ponerte en contacto con nosotros vía WhatsApp para coordinar la entrega personal de tus productos.</p>" : ""}
          ${note?.trim() ? `<div style="background-color: #FFF6F9; border-left: 3px solid #D12F6A; padding: 10px 14px; margin-top: 12px; font-size: 13px; color: #5C4A54;"><strong>Nota:</strong> ${note.trim()}</div>` : ""}
        `,
        ctaButton: {
          text: "Ver mis pedidos",
          url: `${appUrl}/orders`,
        },
      });

      await queueEmail({
        type: "BATCH_ITEM_STATUS_CHANGED",
        toEmail: user.email,
        subject: `Actualización de tus pedidos (${statusLabel}) — Rainbow Cake GO`,
        html: emailHtml,
        relatedUserId: userId,
      });
    }

    revalidatePath("/admin/items");
    revalidatePath("/admin");
    revalidatePath("/orders");

    return {
      success: true,
      message: `Se actualizaron ${items.length} artículo(s) a "${statusLabel}".`,
    };
  } catch (err: unknown) {
    console.error("Error en actualización masiva de artículos:", err);
    const message = err instanceof Error ? err.message : "Error en lote.";
    return { success: false, error: message };
  }
}
