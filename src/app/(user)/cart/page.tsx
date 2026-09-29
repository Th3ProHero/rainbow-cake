"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import { createOrderAction } from "@/actions/orders";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Store,
} from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, subtotal, totalItems } =
    useCart();

  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    setError(null);

    const payload = items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));

    const res = await createOrderAction(payload, note);
    setIsSubmitting(false);

    if (res.success && res.orderCode) {
      clearCart();
      router.push(`/orders/${res.orderCode}/confirmation`);
    } else {
      setError(res.error || "No se pudo procesar tu pedido. Intenta nuevamente.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-cotton mx-auto flex items-center justify-center text-strawberry">
          <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h1 className="text-2xl font-bold font-display text-ink">
          Tu carrito está vacío
        </h1>
        <p className="text-sm text-ink-secondary max-w-sm mx-auto">
          Aún no has agregado ningún artículo a tu carrito. Explora nuestro catálogo de merch y haz tu pedido.
        </p>
        <div className="pt-2">
          <Link href="/catalog">
            <Button>
              <Store className="w-4 h-4 mr-2" />
              Explorar catálogo
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">
          Tu Carrito ({totalItems} {totalItems === 1 ? "artículo" : "artículos"})
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
          Revisa tus artículos antes de confirmar tu pedido manual
        </p>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Items list (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const itemTotal = item.unitPrice * item.quantity;

            return (
              <Card key={item.productId} className="overflow-hidden">
                <CardContent className="p-3.5 sm:p-4 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-meringue/60 border border-pink-200/80 shrink-0">
                    {item.imagePath ? (
                      <Image
                        src={`/api/files/${item.imagePath}`}
                        alt={item.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-strawberry/30">
                        <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-[10px] text-ink-secondary block">
                      {item.sku}
                    </span>
                    <h3 className="font-semibold text-xs sm:text-sm text-ink truncate">
                      {item.name}
                    </h3>
                    <span className="text-xs text-ink-secondary mt-0.5 block">
                      {formatCurrency(item.unitPrice)} c/u
                    </span>
                  </div>

                  {/* Controls & Total */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-sm text-ink">
                      {formatCurrency(itemTotal)}
                    </span>

                    <div className="flex items-center gap-1">
                      <div className="flex items-center border border-pink-200 rounded-lg bg-white overflow-hidden shadow-2xs">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity - 1)
                          }
                          aria-label="Disminuir"
                          className="w-7 h-7 flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(item.productId, item.quantity + 1)
                          }
                          aria-label="Aumentar"
                          className="w-7 h-7 flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        aria-label="Eliminar producto"
                        className="p-1.5 text-ink-secondary hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Notes field */}
          <div className="pt-2 space-y-1.5">
            <label
              htmlFor="cart-note"
              className="text-xs font-semibold text-ink"
            >
              Comentarios o notas para el pedido (opcional)
            </label>
            <Textarea
              id="cart-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej. Entregar en evento del sábado, prefiero empaque especial..."
              rows={2}
              className="text-xs"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Right: Order Summary (1 col) */}
        <div>
          <Card className="sticky top-20 border-pink-200/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-pink-100">
              <CardTitle className="text-base">Resumen del pedido</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-ink-secondary">
                  <span>Envío / Entrega</span>
                  <span className="text-emerald-700 font-semibold">
                    En persona (Gratis)
                  </span>
                </div>
                <div className="pt-2 border-t border-pink-100 flex items-center justify-between text-sm font-extrabold text-ink">
                  <span>Total estimado</span>
                  <span className="text-base text-strawberry">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cotton/50 border border-pink-200/70 text-[11px] text-ink-secondary space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-ink">
                  <ShieldCheck className="w-3.5 h-3.5 text-strawberry" />
                  <span>Sin pago en línea</span>
                </div>
                <p>
                  Al confirmar tu pedido no pagarás nada en la web. El pago y la entrega se coordinan manualmente por WhatsApp y en persona.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleCheckout}
                disabled={isSubmitting}
                className="w-full h-11 text-sm font-bold shadow-xs"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Confirmando pedido...
                  </>
                ) : (
                  <>
                    Confirmar pedido
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/catalog"
                  className="text-xs text-strawberry hover:underline font-medium"
                >
                  Continuar comprando
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
