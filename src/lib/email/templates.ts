/**
 * HTML Email templates with Rainbow Cake GO visual identity.
 * Minimalist, pink & white palette, clean typography, mobile-friendly.
 */

interface BaseEmailProps {
  title: string;
  previewText?: string;
  childrenHtml: string;
  ctaButton?: {
    text: string;
    url: string;
  };
}

export function baseEmailTemplate({
  title,
  previewText,
  childrenHtml,
  ctaButton,
}: BaseEmailProps): string {
  const appUrl = process.env.APP_URL || "http://localhost:18473";
  const buttonHtml = ctaButton
    ? `
    <div style="margin: 28px 0; text-align: center;">
      <a href="${ctaButton.url}" target="_blank" style="background-color: #D12F6A; color: #FFFFFF; font-family: 'Figtree', sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 12px; display: inline-block;">
        ${ctaButton.text}
      </a>
    </div>
  `
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  ${previewText ? `<meta name="description" content="${previewText}">` : ""}
  <style>
    body { margin: 0; padding: 0; background-color: #FFF6F9; font-family: 'Figtree', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2A1720; }
    .container { max-width: 560px; margin: 0 auto; padding: 24px 16px; }
    .card { background-color: #FFFFFF; border-radius: 20px; border: 1px solid #F4D9E3; padding: 32px 24px; box-shadow: 0 4px 16px rgba(209, 47, 106, 0.04); }
    .logo { font-size: 20px; font-weight: 800; color: #2A1720; text-decoration: none; font-family: 'Bricolage Grotesque', sans-serif; }
    .logo-badge { background-color: #D12F6A; color: #FFFFFF; padding: 2px 7px; border-radius: 999px; font-size: 11px; margin-left: 4px; vertical-align: middle; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #7B6470; }
  </style>
</head>
<body>
  <div class="container">
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${appUrl}" class="logo">
        Rainbow Cake <span class="logo-badge">GO</span>
      </a>
    </div>

    <div class="card">
      <h1 style="margin-top: 0; font-size: 22px; font-weight: 700; color: #2A1720; line-height: 1.3;">
        ${title}
      </h1>
      <div style="font-size: 15px; line-height: 1.6; color: #2A1720;">
        ${childrenHtml}
      </div>
      ${buttonHtml}
    </div>

    <div class="footer">
      <p style="margin: 4px 0;">Rainbow Cake GO — Control y seguimiento de merch</p>
      <p style="margin: 4px 0;">Si no solicitaste este correo, puedes ignorarlo con total seguridad.</p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Welcome email template for new users
 */
export function welcomeEmailHtml(name: string, loginUrl: string): string {
  const content = `
    <p>¡Hola <strong>${name}</strong>! Te damos la bienvenida a <strong>Rainbow Cake GO</strong>.</p>
    <p>Tu cuenta ya está lista. A partir de ahora podrás explorar nuestro catálogo de merch, hacer pedidos y seguir el estado de cada uno de tus artículos hasta su entrega en persona.</p>
    <p>No olvides mantener tu número de WhatsApp actualizado en tu perfil para una coordinación rápida y directa.</p>
  `;
  return baseEmailTemplate({
    title: "¡Bienvenida/o a Rainbow Cake GO!",
    previewText: "Tu cuenta ha sido creada exitosamente.",
    childrenHtml: content,
    ctaButton: {
      text: "Entrar al catálogo",
      url: loginUrl,
    },
  });
}

/**
 * Password reset request email
 */
export function passwordResetEmailHtml(name: string, resetUrl: string): string {
  const content = `
    <p>Hola <strong>${name}</strong>,</p>
    <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Rainbow Cake GO.</p>
    <p>Para crear una nueva contraseña, pulsa el siguiente botón. Este enlace es de un solo uso y expirará en <strong>1 hora</strong>:</p>
  `;
  return baseEmailTemplate({
    title: "Restablecer tu contraseña",
    previewText: "Enlace para restablecer tu contraseña en Rainbow Cake GO",
    childrenHtml: content,
    ctaButton: {
      text: "Restablecer contraseña",
      url: resetUrl,
    },
  });
}
