import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  MessageCircle,
  Package,
  ArrowRight,
  ShieldCheck,
  Store,
} from "lucide-react";

export const metadata = {
  title: "Confirmación de Pedido — Rainbow Cake GO",
};

export default async function OrderConfirmationPage(props: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await props.params;
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const order = await prisma.order.findUnique({
    where: { code },
    include: {
      items: true,
      user: {
        select: { name: true, whatsapp: true },
      },
    },
  });

  if (!order) {
    notFound();
  }

  // Security: only owner or admin can view
  if (order.userId !== session.userId && session.role !== "ADMIN") {
    redirect("/");
  }

  // Get business WhatsApp number
  const businessSetting = await prisma.setting.findUnique({
    where: { key: "WHATSAPP_BUSINESS_NUMBER" },
  });
  const businessPhone =
    businessSetting?.value ||
    process.env.WHATSAPP_BUSINESS_NUMBER ||
    "+5215512345678";

  const total = order.items.reduce(
    (sum, item) => sum + parseFloat(item.snapshotUnitPrice.toString()) * item.quantity,
    0
  );

  // Pre-fill WhatsApp message
  const itemsText = order.items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.snapshotName} (${formatCurrency(
          parseFloat(item.snapshotUnitPrice.toString()) * item.quantity
        )})`
    )
    .join("\n");

  const whatsappMessage = `¡Hola! Acabo de hacer el pedido *${order.code}* en Rainbow Cake GO:\n\n${itemsText}\n\n*Total:* ${formatCurrency(
    total
  )}\n\n¿Cómo podemos coordinar el pago y la entrega en persona?`;

  const whatsappUrl = buildWhatsAppLink(businessPhone, whatsappMessage);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {/* Success Banner */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center text-emerald-600 shadow-xs">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-ink tracking-tight">
          ¡Pedido registrado con éxito!
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary max-w-md mx-auto">
          Tu pedido ha quedado guardado en el sistema. Ahora solo falta coordinar el pago y la entrega por WhatsApp.
        </p>
      </div>

      {/* Code Card & WhatsApp CTA */}
      <Card className="border-pink-200/80 shadow-sm overflow-hidden">
        <div className="bg-cotton/60 p-4 border-b border-pink-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-center sm:text-left">
          <div>
            <span className="text-[11px] font-semibold text-ink-secondary uppercase tracking-wider block">
              Código de pedido
            </span>
            <span className="font-mono text-xl sm:text-2xl font-black text-strawberry">
              {order.code}
            </span>
          </div>
          <span className="text-xs text-ink-secondary">
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        <CardContent className="p-5 space-y-5">
          {/* Main WhatsApp Button */}
          <div className="text-center space-y-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 fill-white stroke-none" />
              <span>Continuar por WhatsApp</span>
            </a>
            <p className="text-[11px] text-ink-secondary">
              Se abrirá tu WhatsApp con el detalle de tu pedido y código prellenado
            </p>
          </div>

          {/* Items breakdown */}
          <div className="space-y-3 pt-3 border-t border-pink-100">
            <h3 className="font-bold text-xs uppercase tracking-wider text-ink-secondary">
              Artículos del pedido ({order.items.length})
            </h3>
            <div className="divide-y divide-pink-100">
              {order.items.map((item) => {
                const subtotal =
                  parseFloat(item.snapshotUnitPrice.toString()) * item.quantity;

                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="font-semibold text-ink truncate">
                        {item.quantity}x {item.snapshotName}
                      </p>
                      <span className="font-mono text-[10px] text-ink-secondary">
                        {item.snapshotSku}
                      </span>
                    </div>
                    <span className="font-bold text-ink shrink-0">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-pink-200/80 flex items-center justify-between font-extrabold text-sm text-ink">
              <span>Total a pagar</span>
              <span className="text-base text-strawberry">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

          {order.note && (
            <div className="p-3 rounded-xl bg-meringue text-xs space-y-0.5">
              <span className="font-semibold text-ink-secondary text-[11px]">
                Tu nota:
              </span>
              <p className="text-ink">{order.note}</p>
            </div>
          )}

          <div className="p-3 rounded-xl bg-cotton/30 border border-pink-200/60 text-[11px] text-ink-secondary flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-strawberry shrink-0 mt-0.5" />
            <p>
              El admin registrará tus pagos en la plataforma cuando entregues o transfieras el monto, y verás los comprobantes adjuntos en tu sección de pedidos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Link href="/orders" className="flex-1">
          <Button variant="default" className="w-full">
            <Package className="w-4 h-4 mr-2" />
            Ver mis pedidos
          </Button>
        </Link>
        <Link href="/catalog" className="flex-1">
          <Button variant="outline" className="w-full">
            <Store className="w-4 h-4 mr-2" />
            Seguir explorando
          </Button>
        </Link>
      </div>
    </div>
  );
}
