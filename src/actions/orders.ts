"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { isOfferActive, effectivePrice } from "@/lib/domain/offer";
import { canUserCancel, applyCancellation } from "@/lib/domain/order-item";
import { formatOrderCode, formatCurrency } from "@/lib/utils";
import { queueEmail } from "@/lib/email/queue";
import { baseEmailTemplate } from "@/lib/email/templates";

export interface CreateOrderResult {
  success: boolean;
  error?: string;
  orderCode?: string;
}

interface CartItemInput {
  productId: string;
  quantity: number;
}

/**
 * Create a new order with snapshotted items
 */
export async function createOrderAction(
  items: CartItemInput[],
  note?: string
): Promise<CreateOrderResult> {
  try {
    const session = await getSession();
    if (!session) {
      return {
        success: false,
        error: "Debes iniciar sesión para confirmar tu pedido.",
      };
    }

    if (!items || items.length === 0) {
      return {
        success: false,
        error: "Tu carrito está vacío.",
      };
    }

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user || !user.isActive) {
      return { success: false, error: "Usuario no válido o inactivo." };
    }

    const productIds = items.map((i) => i.productId);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: "ACTIVE",
        archivedAt: null,
      },
    });

    if (dbProducts.length !== items.length) {
      return {
        success: false,
        error: "Uno o más productos ya no están disponibles en el catálogo.",
      };
    }

    // Check availability
    for (const p of dbProducts) {
      if (p.availability === "OUT_OF_STOCK") {
        return {
          success: false,
          error: `El producto "${p.name}" se encuentra agotado.`,
        };
      }
    }

    const now = new Date();

    // Generate next sequential order code
    const lastOrder = await prisma.order.findFirst({
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    let nextSeq = 1;
    if (lastOrder?.code) {
      const match = lastOrder.code.match(/RCG-(\d+)/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const orderCode = formatOrderCode(nextSeq);

    // Create order and items in a single transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          code: orderCode,
          userId: user.id,
          note: note?.trim() || null,
        },
      });

      for (const item of items) {
        const prod = dbProducts.find((p) => p.id === item.productId)!;

        const offerPayload = {
          price: prod.price.toString(),
          offerPrice: prod.offerPrice ? prod.offerPrice.toString() : null,
          offerStartsAt: prod.offerStartsAt,
          offerEndsAt: prod.offerEndsAt,
        };

        const unitPrice = effectivePrice(offerPayload, now);

        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: prod.id,
            snapshotName: prod.name,
            snapshotSku: prod.sku,
            snapshotUnitPrice: unitPrice,
            quantity: item.quantity,
            quantityDelivered: 0,
            quantityCancelled: 0,
            status: "PENDING",
          },
        });

        // Initial log entry
        await tx.orderItemLog.create({
          data: {
            orderItemId: orderItem.id,
            fromStatus: null,
            toStatus: "PENDING",
            deliveredDelta: 0,
            changedById: user.id,
            note: "Pedido creado por el cliente",
          },
        });
      }

      return newOrder;
    });

    // Queue notification emails
    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const userEmailHtml = baseEmailTemplate({
      title: `Confirmación de Pedido ${order.code}`,
      previewText: `Hemos recibido tu pedido ${order.code}.`,
      childrenHtml: `
        <p>¡Hola <strong>${user.name}</strong>!</p>
        <p>Hemos recibido tu pedido <strong>${order.code}</strong> correctamente.</p>
        <p>Recuerda que las entregas se coordinan directamente en persona y vía WhatsApp. Puedes consultar el estado de cada artículo en cualquier momento desde tu panel de pedidos.</p>
      `,
      ctaButton: {
        text: "Ver mis pedidos",
        url: `${appUrl}/orders`,
      },
    });

    await queueEmail({
      type: "ORDER_CREATED",
      toEmail: user.email,
      subject: `Confirmación de pedido ${order.code} — Rainbow Cake GO`,
      html: userEmailHtml,
      relatedOrderId: order.id,
      relatedUserId: user.id,
    });

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFY_EMAILS || process.env.ADMIN_SEED_EMAIL;
    if (adminEmail) {
      const adminEmailHtml = baseEmailTemplate({
        title: `Nuevo Pedido ${order.code}`,
        previewText: `El usuario ${user.name} ha realizado un nuevo pedido.`,
        childrenHtml: `
          <p>Se ha registrado un nuevo pedido:</p>
          <ul>
            <li><strong>Código:</strong> ${order.code}</li>
            <li><strong>Cliente:</strong> ${user.name} (${user.email})</li>
            <li><strong>WhatsApp:</strong> ${user.whatsapp}</li>
            ${order.note ? `<li><strong>Nota:</strong> ${order.note}</li>` : ""}
          </ul>
        `,
        ctaButton: {
          text: "Abrir en panel admin",
          url: `${appUrl}/admin/items?order=${order.id}`,
        },
      });

      await queueEmail({
        type: "ADMIN_ORDER_NOTIFICATION",
        toEmail: adminEmail,
        subject: `Nuevo pedido ${order.code} de ${user.name}`,
        html: adminEmailHtml,
        relatedOrderId: order.id,
      });
    }

    revalidatePath("/orders");
    revalidatePath("/admin/items");

    return {
      success: true,
      orderCode: order.code,
    };
  } catch (err: unknown) {
    console.error("Error al crear pedido:", err);
    const message = err instanceof Error ? err.message : "Error inesperado al crear pedido.";
    return { success: false, error: message };
  }
}

/**
 * Cancel an individual order item by user (allowed only while PENDING)
 */
export async function cancelOrderItemAction(
  orderItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: "Debes iniciar sesión." };
    }

    const item = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: {
          select: { userId: true, code: true },
        },
      },
    });

    if (!item) {
      return { success: false, error: "Artículo no encontrado." };
    }

    // Only owner (or admin) can cancel
    if (item.order.userId !== session.userId && session.role !== "ADMIN") {
      return {
        success: false,
        error: "No tienes permiso para cancelar este artículo.",
      };
    }

    // Users can only cancel while PENDING
    if (session.role !== "ADMIN" && !canUserCancel(item)) {
      return {
        success: false,
        error:
          "Solo puedes cancelar artículos que se encuentren en estado 'Pendiente'. Si ya está en tránsito o almacén, contáctanos por WhatsApp.",
      };
    }

    const cancellation = applyCancellation(item);

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: cancellation.status,
          quantityCancelled: cancellation.quantityCancelled,
        },
      });

      await tx.orderItemLog.create({
        data: {
          orderItemId: item.id,
          fromStatus: item.status,
          toStatus: cancellation.status,
          deliveredDelta: 0,
          changedById: session.userId,
          note:
            session.role === "ADMIN"
              ? "Cancelado por el administrador"
              : "Cancelado por el cliente",
        },
      });
    });

    // Notify admin
    const adminEmail = process.env.ADMIN_NOTIFY_EMAILS || process.env.ADMIN_SEED_EMAIL;
    if (adminEmail && session.role !== "ADMIN") {
      const appUrl = process.env.APP_URL || "http://localhost:18473";
      await queueEmail({
        type: "USER_CANCELLED_ITEM",
        toEmail: adminEmail,
        subject: `Artículo cancelado por cliente en pedido ${item.order.code}`,
        html: baseEmailTemplate({
          title: `Cancelación de artículo en pedido ${item.order.code}`,
          childrenHtml: `
            <p>El cliente ha cancelado el artículo <strong>${item.snapshotName}</strong> (${item.snapshotSku}) del pedido <strong>${item.order.code}</strong>.</p>
          `,
          ctaButton: {
            text: "Ver en panel admin",
            url: `${appUrl}/admin/items`,
          },
        }),
      });
    }

    revalidatePath("/orders");
    revalidatePath("/admin/items");

    return { success: true };
  } catch (err: unknown) {
    console.error("Error al cancelar artículo:", err);
    const message = err instanceof Error ? err.message : "Error al cancelar artículo.";
    return { success: false, error: message };
  }
}
