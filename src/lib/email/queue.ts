import { prisma } from "@/lib/db";

interface QueueEmailOptions {
  type: string;
  toEmail: string;
  subject: string;
  html: string;
  relatedOrderId?: string | null;
  relatedUserId?: string | null;
}

/**
 * Queue an email to the EmailOutbox table for processing by the background worker.
 */
export async function queueEmail({
  type,
  toEmail,
  subject,
  html,
  relatedOrderId,
  relatedUserId,
}: QueueEmailOptions) {
  try {
    return await prisma.emailOutbox.create({
      data: {
        type,
        toEmail: toEmail.toLowerCase().trim(),
        subject,
        html,
        status: "PENDING",
        relatedOrderId: relatedOrderId || null,
        relatedUserId: relatedUserId || null,
      },
    });
  } catch (err) {
    console.error("Error al encolar correo en EmailOutbox:", err);
    return null;
  }
}
