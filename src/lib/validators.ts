/**
 * Zod validation schemas for Rainbow Cake GO.
 * Used in Server Actions and Route Handlers.
 * All validation messages are in Spanish.
 */

import { z } from "zod";

// ── Auth ──────────────────────────────────────

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede tener más de 100 caracteres")
      .trim(),
    email: z
      .string()
      .email("Introduce un correo electrónico válido")
      .max(255, "El correo no puede tener más de 255 caracteres")
      .transform((v) => v.toLowerCase().trim()),
    username: z
      .string()
      .min(3, "El usuario debe tener al menos 3 caracteres")
      .max(30, "El usuario no puede tener más de 30 caracteres")
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "El usuario solo puede contener letras, números, puntos, guiones y guiones bajos"
      )
      .transform((v) => v.toLowerCase().trim()),
    whatsapp: z
      .string()
      .min(7, "Introduce un número de WhatsApp válido")
      .max(20, "El número de WhatsApp es demasiado largo"),
    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres")
      .max(128, "La contraseña no puede tener más de 128 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Introduce tu correo electrónico o nombre de usuario")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, "Introduce tu contraseña"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Introduce un correo electrónico válido")
    .transform((v) => v.toLowerCase().trim()),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres")
      .max(128, "La contraseña no puede tener más de 128 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Introduce tu contraseña actual"),
    newPassword: z
      .string()
      .min(10, "La contraseña debe tener al menos 10 caracteres")
      .max(128, "La contraseña no puede tener más de 128 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

// ── Product ───────────────────────────────────

export const productSchema = z.object({
  sku: z
    .string()
    .min(1, "El SKU es obligatorio")
    .max(50, "El SKU no puede tener más de 50 caracteres")
    .trim(),
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(200, "El nombre no puede tener más de 200 caracteres")
    .trim(),
  description: z.string().max(5000, "La descripción es demasiado larga").optional(),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  merchType: z.string().max(100).optional(),
  price: z
    .number({ message: "El precio debe ser un número" })
    .positive("El precio debe ser mayor a 0")
    .multipleOf(0.01, "El precio solo puede tener 2 decimales"),
  offerPrice: z
    .number()
    .positive("El precio de oferta debe ser mayor a 0")
    .multipleOf(0.01)
    .optional()
    .nullable(),
  offerStartsAt: z.string().datetime().optional().nullable(),
  offerEndsAt: z.string().datetime().optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  availability: z.enum(["IN_STOCK", "ON_DEMAND", "OUT_OF_STOCK"]),
  status: z.enum(["ACTIVE", "HIDDEN"]),
  stock: z.number().int().min(0).optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;

// ── Category ──────────────────────────────────

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede tener más de 100 caracteres")
    .trim(),
  slug: z
    .string()
    .min(1, "El slug es obligatorio")
    .max(100, "El slug no puede tener más de 100 caracteres")
    .trim(),
  sortOrder: z.number().int().min(0).default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ── Order ─────────────────────────────────────

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive("La cantidad debe ser al menos 1"),
      })
    )
    .min(1, "El pedido debe tener al menos un artículo"),
  note: z.string().max(1000, "La nota es demasiado larga").optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ── Payment ───────────────────────────────────

export const paymentSchema = z.object({
  userId: z.string().min(1, "Selecciona un usuario"),
  paidAt: z.string().datetime("Fecha de pago inválida"),
  amount: z
    .number()
    .positive("El monto debe ser mayor a 0")
    .multipleOf(0.01)
    .optional()
    .nullable(),
  method: z.string().max(100).optional(),
  reference: z.string().max(200).optional(),
  note: z.string().max(1000).optional(),
  allocations: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        amountApplied: z
          .number({ message: "El monto aplicado debe ser un número" })
          .positive("El monto aplicado debe ser mayor a 0")
          .multipleOf(0.01),
      })
    )
    .min(1, "Asigna el comprobante a al menos un artículo"),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

// ── User Profile ──────────────────────────────

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .trim(),
  whatsapp: z
    .string()
    .min(7, "Introduce un número de WhatsApp válido")
    .max(20),
});

// ── Settings ──────────────────────────────────

export const settingsSchema = z.object({
  BUSINESS_NAME: z.string().min(1).max(200),
  WHATSAPP_BUSINESS_NUMBER: z.string().min(7).max(20),
  ADMIN_NOTIFY_EMAILS: z.string().min(1).max(500),
});

// ── Message Template ──────────────────────────

export const messageTemplateSchema = z.object({
  name: z
    .string()
    .min(1, "El nombre es obligatorio")
    .max(100)
    .regex(/^[a-z_]+$/, "El nombre solo puede contener letras minúsculas y guiones bajos"),
  body: z
    .string()
    .min(1, "El contenido es obligatorio")
    .max(2000, "El mensaje es demasiado largo"),
  isActive: z.boolean().default(true),
});
