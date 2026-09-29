import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { role: "USER" },
  });

  if (!user) {
    console.log("No hay usuarios tipo USER.");
    return;
  }

  console.log(`Creando pedidos de prueba para ${user.name} (${user.email})...`);

  const products = await prisma.product.findMany({
    take: 3,
  });

  if (products.length === 0) {
    console.log("No hay productos.");
    return;
  }

  // Create an order with 2 items
  const order1 = await prisma.order.create({
    data: {
      code: "RCG-000001",
      userId: user.id,
      note: "Entrega preferente en Metro Insurgentes los fines de semana",
      items: {
        create: [
          {
            productId: products[0].id,
            snapshotName: products[0].name,
            snapshotSku: products[0].sku,
            snapshotUnitPrice: products[0].price,
            quantity: 2,
            quantityDelivered: 0,
            quantityCancelled: 0,
            status: "IN_WAREHOUSE",
            logs: {
              create: [
                {
                  fromStatus: null,
                  toStatus: "PENDING",
                  deliveredDelta: 0,
                  changedById: user.id,
                  note: "Pedido creado por cliente",
                },
                {
                  fromStatus: "PENDING",
                  toStatus: "IN_WAREHOUSE",
                  deliveredDelta: 0,
                  changedById: user.id,
                  note: "Llegó al almacén local",
                },
              ],
            },
          },
          {
            productId: products[1].id,
            snapshotName: products[1].name,
            snapshotSku: products[1].sku,
            snapshotUnitPrice: products[1].price,
            quantity: 1,
            quantityDelivered: 0,
            quantityCancelled: 0,
            status: "IN_TRANSIT",
            logs: {
              create: [
                {
                  fromStatus: null,
                  toStatus: "PENDING",
                  deliveredDelta: 0,
                  changedById: user.id,
                  note: "Pedido creado por cliente",
                },
                {
                  fromStatus: "PENDING",
                  toStatus: "IN_TRANSIT",
                  deliveredDelta: 0,
                  changedById: user.id,
                  note: "En tránsito internacional",
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Pedido ${order1.code} creado con éxito.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
