"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { CatalogProduct } from "@/types";
import { PromoBanners, type PromoBannerData } from "./promo-banners";
import { AboutSection } from "./about-section";
import {
  Search,
  Plus,
  Check,
  ShoppingBag,
  Sparkles,
  Package,
  Layers,
  Filter,
} from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

interface CatalogViewProps {
  products: CatalogProduct[];
  categories: CategoryItem[];
  banners?: PromoBannerData[];
  whatsappPhone?: string;
}

export function CatalogView({
  products,
  categories,
  banners = [],
  whatsappPhone = "",
}: CatalogViewProps) {
  const { addItem } = useCart();
  const [search, setSearch] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("ALL");
  const [selectedMerchType, setSelectedMerchType] = React.useState<string>("ALL");
  const [addedProductId, setAddedProductId] = React.useState<string | null>(null);

  // Extract distinct merch types for filtering
  const merchTypes = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.merchType) set.add(p.merchType);
    });
    return Array.from(set).sort();
  }, [products]);

  // Filter products
  const filteredProducts = React.useMemo(() => {
    return products.filter((p) => {
      // Category filter
      if (selectedCategory !== "ALL" && p.category.id !== selectedCategory) {
        return false;
      }
      // Merch type filter
      if (selectedMerchType !== "ALL" && p.merchType !== selectedMerchType) {
        return false;
      }
      // Text search
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesSku = p.sku.toLowerCase().includes(query);
        const matchesDesc = p.description?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesSku && !matchesDesc) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedCategory, selectedMerchType, search]);

  const handleAddToCart = (e: React.MouseEvent, product: CatalogProduct) => {
    e.preventDefault();
    e.stopPropagation();

    const price = product.isOfferActive && product.offerPrice
      ? product.offerPrice
      : product.price;

    addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        unitPrice: price,
        imagePath: product.imagePath,
      },
      1
    );

    setAddedProductId(product.id);
    setTimeout(() => {
      setAddedProductId((current) => (current === product.id ? null : current));
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-ink tracking-tight">
            Catálogo de Merch
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-0.5">
            Elige tus artículos favoritos, haz tu pedido y coordina por WhatsApp
          </p>
        </div>

        {/* Promotional Banners */}
        {banners.length > 0 && (
          <PromoBanners banners={banners} whatsappPhone={whatsappPhone} />
        )}

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            placeholder="Buscar por artículo, colección o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 text-sm h-11 bg-white rounded-2xl border-pink-200/80 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-secondary hover:text-ink cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Pills (Horizontal scrollable on mobile) */}
      <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-2 pb-1 min-w-max">
          <button
            onClick={() => setSelectedCategory("ALL")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
              selectedCategory === "ALL"
                ? "bg-strawberry text-white shadow-xs"
                : "bg-white border border-pink-200/80 text-ink-secondary hover:bg-cotton/40"
            }`}
          >
            Todos ({products.length})
          </button>
          {categories.map((c) => {
            const count = products.filter((p) => p.category.id === c.id).length;
            const isSelected = selectedCategory === c.id;

            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-strawberry text-white shadow-xs"
                    : "bg-white border border-pink-200/80 text-ink-secondary hover:bg-cotton/40"
                }`}
              >
                {c.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Merch Type Filter Pills (if any exist) */}
      {merchTypes.length > 0 && (
        <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pt-0.5">
          <div className="flex items-center gap-1.5 min-w-max text-xs">
            <span className="text-[11px] text-ink-secondary font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-strawberry" /> Tipo:
            </span>
            <button
              onClick={() => setSelectedMerchType("ALL")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                selectedMerchType === "ALL"
                  ? "bg-cotton text-strawberry font-semibold"
                  : "bg-white/80 border border-pink-100 text-ink-secondary hover:bg-meringue"
              }`}
            >
              Cualquiera
            </button>
            {merchTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedMerchType(type)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  selectedMerchType === type
                    ? "bg-cotton text-strawberry font-semibold"
                    : "bg-white/80 border border-pink-100 text-ink-secondary hover:bg-meringue"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product Grid: 2 columns on mobile, 3 on tablet, 4 on desktop */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-3xl border border-pink-200/70 p-12 text-center space-y-3">
          <Package className="w-12 h-12 mx-auto text-strawberry/30" />
          <h3 className="font-bold text-base text-ink">
            No encontramos productos con estos filtros
          </h3>
          <p className="text-xs text-ink-secondary max-w-xs mx-auto">
            Prueba buscando con otro término o seleccionando otra categoría.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch("");
              setSelectedCategory("ALL");
              setSelectedMerchType("ALL");
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.availability === "OUT_OF_STOCK";
            const isOnDemand = p.availability === "ON_DEMAND";
            const isAdded = addedProductId === p.id;

            return (
              <Link
                key={p.id}
                href={`/catalog/${p.id}`}
                className="group flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-pink-200/70 overflow-hidden shadow-2xs hover:shadow-md hover:border-pink-300 transition-all"
              >
                {/* Product Image Container */}
                <div className="relative aspect-square bg-meringue/40 overflow-hidden">
                  {p.imagePath ? (
                    <Image
                      src={`/api/files/${p.imagePath}`}
                      alt={p.name}
                      fill
                      className="object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-strawberry/30 p-4">
                      <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 stroke-[1.5]" />
                      <span className="text-[10px] text-ink-secondary/40 font-mono mt-1">
                        {p.sku}
                      </span>
                    </div>
                  )}

                  {/* Badges on Top */}
                  <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-1 pointer-events-none">
                    {/* Offer badge */}
                    {p.isOfferActive && p.discountPercent ? (
                      <span className="bg-strawberry text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 fill-white" />
                        -{p.discountPercent}%
                      </span>
                    ) : (
                      <span />
                    )}

                    {/* Availability badges */}
                    {isOutOfStock ? (
                      <span className="bg-ink/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                        Agotado
                      </span>
                    ) : isOnDemand ? (
                      <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                        Bajo pedido
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Details */}
                <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-ink-secondary">
                      <span className="font-mono text-[10px]">{p.sku}</span>
                      {p.merchType && (
                        <span className="font-medium text-strawberry truncate max-w-[80px]">
                          {p.merchType}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-xs sm:text-sm text-ink line-clamp-2 leading-snug group-hover:text-strawberry transition-colors">
                      {p.name}
                    </h3>
                  </div>

                  <div className="pt-1 flex items-end justify-between">
                    <div>
                      {p.isOfferActive && p.offerPrice ? (
                        <div>
                          <span className="text-xs sm:text-sm text-ink-secondary line-through block leading-none">
                            {formatCurrency(p.price)}
                          </span>
                          <span className="text-sm sm:text-base font-extrabold text-strawberry leading-tight">
                            {formatCurrency(p.offerPrice)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm sm:text-base font-extrabold text-ink leading-tight">
                          {formatCurrency(p.price)}
                        </span>
                      )}
                    </div>

                    {/* Quick Add to Cart button */}
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={(e) => handleAddToCart(e, p)}
                      aria-label={`Agregar ${p.name} al carrito`}
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        isOutOfStock
                          ? "bg-neutral-100 text-neutral-400 cursor-not-allowed"
                          : isAdded
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-cotton text-strawberry hover:bg-strawberry hover:text-white"
                      }`}
                    >
                      {isAdded ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* About Section */}
      <AboutSection whatsappPhone={whatsappPhone} />
    </div>
  );
}
