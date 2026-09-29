/**
 * WhatsApp integration.
 * Generates wa.me links with pre-filled messages.
 * Defines a WhatsAppProvider interface for future official API integration.
 */

import { phoneForWhatsApp } from "@/lib/domain/phone";

/**
 * Build a WhatsApp link with a pre-filled message.
 * @param phone Phone number in E.164 format (e.g., "+5215512345678")
 * @param message Pre-filled message text
 * @returns WhatsApp URL
 */
export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phoneForWhatsApp(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Fill template variables in a message.
 * Variables: {nombre}, {pedido}, {producto}, {estado}, {saldo}
 */
export function fillMessageTemplate(
  template: string,
  variables: {
    nombre?: string;
    pedido?: string;
    producto?: string;
    estado?: string;
    saldo?: string;
  }
): string {
  let result = template;
  if (variables.nombre) result = result.replace(/\{nombre\}/g, variables.nombre);
  if (variables.pedido) result = result.replace(/\{pedido\}/g, variables.pedido);
  if (variables.producto) result = result.replace(/\{producto\}/g, variables.producto);
  if (variables.estado) result = result.replace(/\{estado\}/g, variables.estado);
  if (variables.saldo) result = result.replace(/\{saldo\}/g, variables.saldo);
  return result;
}

/**
 * Interface for WhatsApp provider.
 * Current implementation uses wa.me links.
 * Future: can be swapped for the official WhatsApp Business API.
 */
export interface WhatsAppProvider {
  /**
   * Send or prepare a message to a phone number.
   * Returns a URL to open (for link-based) or a message ID (for API-based).
   */
  sendMessage(phone: string, message: string): Promise<{ url?: string; messageId?: string }>;

  /**
   * Check if the provider supports direct sending (API) or just link generation.
   */
  supportsDirectSend(): boolean;
}

/**
 * Link-based WhatsApp provider (current implementation).
 * Opens wa.me links; does not send messages directly.
 */
export class WhatsAppLinkProvider implements WhatsAppProvider {
  async sendMessage(phone: string, message: string) {
    return { url: buildWhatsAppLink(phone, message) };
  }

  supportsDirectSend() {
    return false;
  }
}

/**
 * Get the configured WhatsApp provider.
 * Currently always returns the link-based provider.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  return new WhatsAppLinkProvider();
}
