import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creando categorías de demostración...");

  const catPhotocards = await prisma.category.upsert({
    where: { slug: "photocards-coleccionables" },
    update: {},
    create: {
      name: "Photocards & Coleccionables",
      slug: "photocards-coleccionables",
      sortOrder: 0,
    },
  });

  const catPeluches = await prisma.category.upsert({
    where: { slug: "peluches-figuras" },
    update: {},
    create: {
      name: "Peluches & Figuras",
      slug: "peluches-figuras",
      sortOrder: 1,
    },
  });

  const catRopa = await prisma.category.upsert({
    where: { slug: "ropa-accesorios" },
    update: {},
    create: {
      name: "Ropa & Accesorios",
      slug: "ropa-accesorios",
      sortOrder: 2,
    },
  });

  console.log("Categorías listas.");

  const now = new Date();
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const demoProducts = [
    // Photocards
    {
      sku: "RCG-PC-001",
      name: "Set Photocards Holográficas World Tour",
      description: "Edición especial con acabado holográfico brillante arcoíris. Set de 5 piezas.",
      categoryId: catPhotocards.id,
      merchType: "Photocard",
      price: 250.0,
      offerPrice: 199.0,
      offerStartsAt: lastMonth,
      offerEndsAt: nextMonth,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 15,
    },
    {
      sku: "RCG-PC-002",
      name: "Photocard Lucky Draw Acrílica",
      description: "Photocard exclusiva en acrílico transparente de 2mm con borde biselado.",
      categoryId: catPhotocards.id,
      merchType: "Photocard",
      price: 180.0,
      offerPrice: null,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 8,
    },
    {
      sku: "RCG-PC-003",
      name: "Binder Archivador Rosa Pastel A5",
      description: "Archivador de 6 anillas con 20 fundas de 4 bolsillos libres de ácido.",
      categoryId: catPhotocards.id,
      merchType: "Libreta",
      price: 320.0,
      offerPrice: 280.0,
      offerStartsAt: lastMonth,
      offerEndsAt: nextMonth,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 5,
    },
    {
      sku: "RCG-PC-004",
      name: "Toploaders Deco con Lazos y Perlas (Pack 10)",
      description: "Protectores rígidos decorados a mano con estilo kawaii y brillos.",
      categoryId: catPhotocards.id,
      merchType: "Stickers",
      price: 140.0,
      offerPrice: null,
      availability: "ON_DEMAND" as const,
      status: "ACTIVE" as const,
      stock: 0,
      releaseDate: nextMonth,
    },

    // Peluches & Figuras
    {
      sku: "RCG-PL-001",
      name: "Peluche Mascota Strawberry Bunny 20cm",
      description: "Peluche ultrasuave con traje de frutilla removible y llavero metálico.",
      categoryId: catPeluches.id,
      merchType: "Peluche",
      price: 480.0,
      offerPrice: 420.0,
      offerStartsAt: lastMonth,
      offerEndsAt: nextMonth,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 12,
    },
    {
      sku: "RCG-PL-002",
      name: "Mini Peluche Llavero Pastel Bear",
      description: "Llavero de peluche acolchado de 10cm ideal para colgar en mochilas o lightsticks.",
      categoryId: catPeluches.id,
      merchType: "Llavero",
      price: 190.0,
      offerPrice: null,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 20,
    },
    {
      sku: "RCG-PL-003",
      name: "Stand Acrílico Rainbow Stage Diorama",
      description: "Diorama desmontable de 3 piezas en acrílico de alta definición con base estrellada.",
      categoryId: catPeluches.id,
      merchType: "Acrílico",
      price: 260.0,
      offerPrice: null,
      availability: "ON_DEMAND" as const,
      status: "ACTIVE" as const,
      stock: 0,
      releaseDate: nextMonth,
    },
    {
      sku: "RCG-PL-004",
      name: "Lightstick Oficial Rainbow Dream Ver. 2",
      description: "Lightstick con conectividad Bluetooth, cambio de 16 colores y modo concierto.",
      categoryId: catPeluches.id,
      merchType: "Lightstick",
      price: 1250.0,
      offerPrice: null,
      availability: "OUT_OF_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 0,
    },

    // Ropa & Accesorios
    {
      sku: "RCG-RP-001",
      name: "Hoodie Oversize Rosa Algodón 'Cake GO'",
      description: "Sudadera de franela pesada 100% algodón con bordado frontal en relieve.",
      categoryId: catRopa.id,
      merchType: "Ropa",
      price: 750.0,
      offerPrice: 650.0,
      offerStartsAt: lastMonth,
      offerEndsAt: nextMonth,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 7,
    },
    {
      sku: "RCG-RP-002",
      name: "Tote Bag de Lona con Bolsillo Interno",
      description: "Bolsa resistente de lona blanca con asas rosa fresa y cierre magnético.",
      categoryId: catRopa.id,
      merchType: "Bolsa tote",
      price: 220.0,
      offerPrice: null,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 18,
    },
    {
      sku: "RCG-RP-003",
      name: "Gorra Baseball Bordada 'Rainbow'",
      description: "Gorra ajustable con hebilla metálica y bordado tipográfico fino.",
      categoryId: catRopa.id,
      merchType: "Ropa",
      price: 280.0,
      offerPrice: 240.0,
      offerStartsAt: lastMonth,
      offerEndsAt: nextMonth,
      availability: "ON_DEMAND" as const,
      status: "ACTIVE" as const,
      stock: 0,
      releaseDate: nextMonth,
    },
    {
      sku: "RCG-RP-004",
      name: "Pin Metálico Esmaltado Rebanada de Pastel",
      description: "Pin de solapa con baño dorado y doble broche de mariposa de silicona.",
      categoryId: catRopa.id,
      merchType: "Pin metálico",
      price: 95.0,
      offerPrice: null,
      availability: "IN_STOCK" as const,
      status: "ACTIVE" as const,
      stock: 35,
    },
  ];

  console.log("Insertando productos de demostración...");

  for (const prod of demoProducts) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: prod,
      create: prod,
    });
  }

  console.log("✅ 12 productos de demostración creados/actualizados exitosamente.");
}

main()
  .catch((e) => {
    console.error("Error en seed de demo:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
