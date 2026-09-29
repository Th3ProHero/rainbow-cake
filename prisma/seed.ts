/**
 * Rainbow Cake GO — Database Seed
 * Creates the first admin user from environment variables.
 * No default passwords — must be set via ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL;
  const password = process.env.ADMIN_SEED_PASSWORD;
  const name = process.env.ADMIN_SEED_NAME || "Administrador";

  if (!email || !password) {
    console.error(
      "❌ ADMIN_SEED_EMAIL y ADMIN_SEED_PASSWORD son obligatorios.\n" +
      "   Define estas variables en tu archivo .env"
    );
    process.exit(1);
  }

  if (password.length < 10) {
    console.error("❌ La contraseña del admin debe tener al menos 10 caracteres.");
    process.exit(1);
  }

  // Check if admin already exists
  const existing = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existing) {
    console.log(`ℹ️  Ya existe un admin: ${existing.email}. Seed omitido.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase().trim(),
      username: "admin",
      passwordHash,
      role: "ADMIN",
      whatsapp: process.env.WHATSAPP_BUSINESS_NUMBER || "+5215500000000",
      isActive: true,
      mustChangePassword: true,
      emailVerified: true,
    },
  });

  console.log(`✅ Admin creado: ${admin.email} (${admin.name})`);
  console.log("⚠️  Debe cambiar la contraseña en el primer acceso.");

  // Create default settings
  const defaultSettings = [
    {
      key: "BUSINESS_NAME",
      value: "Rainbow Cake GO",
    },
    {
      key: "WHATSAPP_BUSINESS_NUMBER",
      value: process.env.WHATSAPP_BUSINESS_NUMBER || "+5215512345678",
    },
    {
      key: "ADMIN_NOTIFY_EMAILS",
      value: process.env.ADMIN_NOTIFY_EMAILS || email,
    },
  ];

  for (const setting of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  console.log("✅ Configuración inicial creada.");

  // Create default message templates
  const defaultTemplates = [
    {
      name: "articulo_en_almacen",
      body: "¡Hola {nombre}! 🎉 Tu artículo {producto} del pedido {pedido} ya llegó a nuestro almacén. Coordina tu entrega con nosotros.",
    },
    {
      name: "listo_para_entrega",
      body: "¡Hola {nombre}! Tu artículo {producto} está listo para entregarte. ¿Cuándo te queda bien recogerlo?",
    },
    {
      name: "recordatorio_saldo",
      body: "Hola {nombre}, te recordamos que tienes un saldo pendiente de {saldo} en tu pedido {pedido}. ¿Necesitas ayuda?",
    },
    {
      name: "aviso_general",
      body: "¡Hola {nombre}! Tenemos novedades que te pueden interesar. Revisa nuestro catálogo actualizado 🛍️",
    },
  ];

  for (const template of defaultTemplates) {
    await prisma.messageTemplate.upsert({
      where: { name: template.name },
      update: { body: template.body },
      create: template,
    });
  }

  console.log("✅ Plantillas de mensaje creadas.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
