"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getSession,
  getCurrentUser,
} from "@/lib/auth";
import { checkRateLimit, resetRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "@/lib/validators";
import { validatePhone, normalizePhone } from "@/lib/domain/phone";
import { queueEmail } from "@/lib/email/queue";
import { welcomeEmailHtml, passwordResetEmailHtml } from "@/lib/email/templates";

export interface ActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
  redirectUrl?: string;
}

/**
 * Register a new user
 */
export async function registerAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    whatsapp: formData.get("whatsapp"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  // Rate limiting check
  const ipKey = `register:${rawData.email || "anon"}`;
  const rateLimit = checkRateLimit(
    ipKey,
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowMs
  );
  if (!rateLimit.allowed) {
    const mins = Math.ceil(rateLimit.resetMs / 60000);
    return {
      success: false,
      error: `Demasiados intentos de registro. Por favor espera ${mins} minutos.`,
    };
  }

  // Schema validation
  const parsed = registerSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      fieldErrors[field] = issue.message;
    }
    return {
      success: false,
      error: "Revisa los campos del formulario.",
      fieldErrors,
    };
  }

  const { name, email, username, whatsapp, password } = parsed.data;

  // Strict Phone Validation (E.164 required)
  const isPhoneValid = validatePhone(whatsapp);
  const normalizedPhone = normalizePhone(whatsapp);
  if (!isPhoneValid || !normalizedPhone) {
    return {
      success: false,
      error: "El número de WhatsApp es obligatorio y debe ser un número válido.",
      fieldErrors: {
        whatsapp: "Ingresa un número de WhatsApp válido con lada/código de país.",
      },
    };
  }

  // Check unique email
  const existingEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingEmail) {
    return {
      success: false,
      error: "Ya existe una cuenta con este correo electrónico.",
      fieldErrors: { email: "Este correo ya está registrado." },
    };
  }

  // Check unique username
  const existingUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingUsername) {
    return {
      success: false,
      error: "Este nombre de usuario ya está en uso.",
      fieldErrors: { username: "Elige otro nombre de usuario." },
    };
  }

  // Hash password with bcrypt cost 12
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      whatsapp: normalizedPhone,
      passwordHash,
      role: "USER",
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Queue welcome email
  const appUrl = process.env.APP_URL || "http://localhost:18473";
  await queueEmail({
    type: "USER_REGISTERED",
    toEmail: user.email,
    subject: "¡Bienvenida/o a Rainbow Cake GO!",
    html: welcomeEmailHtml(user.name, `${appUrl}/catalog`),
    relatedUserId: user.id,
  });

  // Create session cookie
  await createSession(user.id, user.role, false);

  return {
    success: true,
    redirectUrl: "/catalog",
  };
}

/**
 * Log in with email or username
 */
export async function loginAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  };
  const from = (formData.get("from") as string) || "";

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: "Introduce tus datos de acceso.",
    };
  }

  const { identifier, password } = parsed.data;
  console.log(`[LOGIN ATTEMPT] identifier: "${identifier}", password length: ${password.length}`);

  // Rate limiting check per identifier
  const rateLimit = checkRateLimit(
    `login:${identifier}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowMs
  );
  if (!rateLimit.allowed) {
    const mins = Math.ceil(rateLimit.resetMs / 60000);
    return {
      success: false,
      error: `Demasiados intentos fallidos. Por seguridad, espera ${mins} minutos antes de volver a intentar.`,
    };
  }

  // Find user by lowercase email or username
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: identifier }, { username: identifier }],
    },
  });

  if (!user || !user.isActive) {
    console.log(`[LOGIN FAILED] User not found or inactive for: "${identifier}"`);
    return {
      success: false,
      error: "Correo o contraseña incorrectos.",
    };
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    console.log(`[LOGIN FAILED] Password mismatch for user: "${identifier}"`);
    return {
      success: false,
      error: "Correo o contraseña incorrectos.",
    };
  }

  console.log(`[LOGIN SUCCESS] User authenticated: "${user.email}" (${user.role}), mustChangePassword: ${user.mustChangePassword}`);

  // Reset rate limit on success
  resetRateLimit(`login:${identifier}`);

  // Create session
  await createSession(user.id, user.role, user.mustChangePassword);

  let targetUrl = "/catalog";
  if (user.mustChangePassword) {
    targetUrl = "/change-password";
  } else if (user.role === "ADMIN") {
    targetUrl = from.startsWith("/admin") ? from : "/admin";
  } else if (from && !from.startsWith("/admin")) {
    targetUrl = from;
  }

  return {
    success: true,
    redirectUrl: targetUrl,
  };
}

/**
 * Log out
 */
export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

/**
 * Request password reset
 */
export async function requestPasswordResetAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const rawEmail = formData.get("email");
  const parsed = forgotPasswordSchema.safeParse({ email: rawEmail });
  if (!parsed.success) {
    return {
      success: false,
      error: "Introduce un correo electrónico válido.",
    };
  }

  const { email } = parsed.data;

  const rateLimit = checkRateLimit(
    `reset:${email}`,
    RATE_LIMITS.passwordReset.limit,
    RATE_LIMITS.passwordReset.windowMs
  );
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: "Demasiadas solicitudes. Espera unos minutos.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user && user.isActive) {
    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:18473";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    await queueEmail({
      type: "PASSWORD_RESET",
      toEmail: user.email,
      subject: "Restablecer tu contraseña — Rainbow Cake GO",
      html: passwordResetEmailHtml(user.name, resetUrl),
      relatedUserId: user.id,
    });
  }

  // Consistent message to prevent enumeration
  return {
    success: true,
    message:
      "Si existe una cuenta asociada a este correo, recibirás un enlace con instrucciones para restablecer tu contraseña.",
  };
}

/**
 * Reset password with token
 */
export async function resetPasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = resetPasswordSchema.safeParse(rawData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as string;
      fieldErrors[field] = issue.message;
    }
    return {
      success: false,
      error: "Revisa los campos.",
      fieldErrors,
    };
  }

  const { token, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpiry: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return {
      success: false,
      error:
        "El enlace para restablecer tu contraseña no es válido o ha expirado. Por favor solicita uno nuevo.",
    };
  }

  const newHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      resetToken: null,
      resetTokenExpiry: null,
      mustChangePassword: false,
    },
  });

  return {
    success: true,
    message: "Tu contraseña ha sido restablecida. Ahora puedes iniciar sesión.",
    redirectUrl: "/login",
  };
}

/**
 * Change password (forced or optional from profile)
 */
export async function changePasswordAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Debes iniciar sesión para cambiar tu contraseña.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });
  if (!user) {
    return { success: false, error: "Usuario no encontrado." };
  }

  const currentPassword = (formData.get("currentPassword") as string) || "";
  const newPassword = (formData.get("newPassword") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";

  // If not mandatory, require and verify current password
  if (!user.mustChangePassword) {
    if (!currentPassword) {
      return {
        success: false,
        error: "Debes ingresar tu contraseña actual.",
        fieldErrors: { currentPassword: "Campo obligatorio" },
      };
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return {
        success: false,
        error: "La contraseña actual es incorrecta.",
        fieldErrors: { currentPassword: "Contraseña incorrecta" },
      };
    }
  }

  if (newPassword.length < 10) {
    return {
      success: false,
      error: "La nueva contraseña debe tener al menos 10 caracteres.",
      fieldErrors: { newPassword: "Mínimo 10 caracteres" },
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      error: "Las contraseñas no coinciden.",
      fieldErrors: { confirmPassword: "No coincide con la nueva contraseña" },
    };
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
    },
  });

  // Refresh session cookie
  await createSession(user.id, user.role, false);

  const redirectUrl = user.role === "ADMIN" ? "/admin" : "/catalog";

  return {
    success: true,
    message: "Contraseña actualizada exitosamente.",
    redirectUrl,
  };
}

/**
 * Update user profile (name, whatsapp)
 */
export async function updateProfileAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Sesión no válida." };
  }

  const name = ((formData.get("name") as string) || "").trim();
  const whatsapp = ((formData.get("whatsapp") as string) || "").trim();

  if (name.length < 2) {
    return {
      success: false,
      error: "El nombre debe tener al menos 2 caracteres.",
      fieldErrors: { name: "Mínimo 2 caracteres" },
    };
  }

  const isValid = validatePhone(whatsapp);
  const normalizedPhone = normalizePhone(whatsapp);
  if (!isValid || !normalizedPhone) {
    return {
      success: false,
      error: "El número de WhatsApp es obligatorio y debe ser válido.",
      fieldErrors: { whatsapp: "Número inválido" },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name,
      whatsapp: normalizedPhone,
    },
  });

  return {
    success: true,
    message: "Perfil actualizado correctamente.",
  };
}
