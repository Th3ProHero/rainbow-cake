import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

/**
 * Configure Nodemailer transport.
 * Supports production SMTP or in-memory JSON stub for dev/tests.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  // Fallback for development/testing: JSON mock transporter
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

export interface ProcessOutboxResult {
  processed: number;
  sent: number;
  failed: number;
  errors: string[];
}

/**
 * Process a batch of pending emails in EmailOutbox.
 * Max 3 attempts per message with status update to SENT or FAILED.
 */
export async function processEmailOutbox(batchSize = 25): Promise<ProcessOutboxResult> {
  const result: ProcessOutboxResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [],
  };

  const pendingEmails = await prisma.emailOutbox.findMany({
    where: {
      status: "PENDING",
      attempts: { lt: 3 },
    },
    take: batchSize,
    orderBy: { createdAt: "asc" },
  });

  if (pendingEmails.length === 0) {
    return result;
  }

  const transporter = getTransporter();
  const fromAddress = process.env.SMTP_FROM || '"Rainbow Cake GO" <hola@rainbowcakego.com>';

  for (const email of pendingEmails) {
    result.processed++;
    try {
      await transporter.sendMail({
        from: fromAddress,
        to: email.toEmail,
        subject: email.subject,
        html: email.html,
      });

      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });

      result.sent++;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al enviar correo.";
      const nextAttempts = email.attempts + 1;
      const nextStatus = nextAttempts >= 3 ? "FAILED" : "PENDING";

      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: {
          attempts: nextAttempts,
          status: nextStatus,
          lastError: errorMsg,
        },
      });

      result.failed++;
      result.errors.push(`Email ${email.id} (${email.toEmail}): ${errorMsg}`);
    }
  }

  return result;
}
