"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CatalogProduct } from "@/types";
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Sparkles,
  Calendar,
  Layers,
  Tag,
  ShieldCheck,
} from "lucide-react";

export function ProductDetailView({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = React.useState(1);
  const [isAdded, setIsAdded] = React.useState(false);

  const isOutOfStock = product.availability === "OUT_OF_STOCK";
  const isOnDemand = product.availability === "ON_DEMAND";

  const effectivePrice = product.isOfferActive && product.offerPrice
    ? product.offerPrice
    : product.price;

  const handleAddToCart = () => {
    if (isOutOfStock) return;

    addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: effectivePrice,
        imagePath: product.imagePath,
      },
      quantity
    );

    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push("/cart");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/catalog"
          className="inline-flex items-center text-xs font-semibold text-strawberry hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Volver al catálogo
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
        {/* Left: Image Container */}
        <div className="relative aspect-square rounded-3xl overflow-hidden bg-white border border-pink-200/80 shadow-xs">
          {product.imagePath ? (
            <Image
              src={`/api/files/${product.imagePath}`}
              alt={product.name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-strawberry/30 p-8">
              <ShoppingBag className="w-16 h-16 stroke-[1.5]" />
              <span className="text-xs text-ink-secondary/50 font-mono mt-2">
                {product.sku}
              </span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2 pointer-events-none">
            {product.isOfferActive && product.discountPercent ? (
              <span className="bg-strawberry text-white text-xs font-extrabold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                OFERTA -{product.discountPercent}%
              </span>
            ) : (
              <span />
            )}

            {isOutOfStock ? (
              <span className="bg-ink/80 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                Agotado
              </span>
            ) : isOnDemand ? (
              <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                Bajo pedido
              </span>
            ) : null}
          </div>
        </div>

        {/* Right: Info and Purchase */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-cotton text-strawberry border-none text-xs">
                {product.category.name}
              </Badge>
              {product.merchType && (
                <Badge variant="outline" className="text-xs text-ink-secondary border-pink-200">
                  {product.merchType}
                </Badge>
              )}
              <span className="text-xs font-mono text-ink-secondary ml-auto">
                {product.sku}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-ink tracking-tight leading-tight">
              {product.name}
            </h1>

            {/* Pricing Section */}
            <div className="p-4 bg-white rounded-2xl border border-pink-200/80 shadow-2xs space-y-1">
              {product.isOfferActive && product.offerPrice ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-strawberry">
                      {formatCurrency(product.offerPrice)}
                    </span>
                    <span className="text-sm font-semibold text-strawberry bg-cotton px-2 py-0.5 rounded-full">
                      Ahorras {formatCurrency(product.price - product.offerPrice)}
                    </span>
                  </div>
                  <span className="text-xs text-ink-secondary line-through">
                    Precio regular: {formatCurrency(product.price)}
                  </span>
                </div>
              ) : (
                <span className="text-2xl sm:text-3xl font-black text-ink">
                  {formatCurrency(product.price)}
                </span>
              )}

              {isOnDemand && product.releaseDate && (
                <div className="pt-2 flex items-center gap-1.5 text-xs text-amber-700">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Fecha estimada de llegada: <strong>{formatDate(product.releaseDate)}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-1.5 pt-1">
                <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
                  Descripción
                </h3>
                <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons Section */}
          <div className="space-y-3 pt-4 border-t border-pink-200/60">
            {isOutOfStock ? (
              <div className="p-3 bg-neutral-100 rounded-xl text-center text-xs font-semibold text-neutral-500">
                Este artículo se encuentra actualmente agotado.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-ink-secondary">Cantidad:</span>
                  <div className="flex items-center border border-pink-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      aria-label="Disminuir cantidad"
                      className="w-9 h-9 flex items-center justify-center text-ink-secondary hover:text-ink disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-bold text-sm text-ink">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      aria-label="Aumentar cantidad"
                      className="w-9 h-9 flex items-center justify-center text-ink-secondary hover:text-ink cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button
                    type="button"
                    variant="default"
                    onClick={handleAddToCart}
                    className="flex-1 h-12 text-sm font-bold"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 mr-2 stroke-[3]" />
                        ¡Agregado al carrito!
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Agregar al carrito ({formatCurrency(effectivePrice * quantity)})
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBuyNow}
                    className="h-12 text-sm font-semibold border-pink-200 hover:bg-cotton/30 text-ink"
                  >
                    Comprar ahora
                  </Button>
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 pt-2 text-[11px] text-ink-secondary">
              <ShieldCheck className="w-3.5 h-3.5 text-strawberry" />
              <span>Entregas coordinadas en persona y seguimiento por WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
