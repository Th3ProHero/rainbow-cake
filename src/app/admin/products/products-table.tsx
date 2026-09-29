"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  duplicateProductAction,
  archiveProductAction,
  restoreProductAction,
  batchUpdateAvailabilityAction,
} from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/lib/constants";
import type { ProductAvailability, ProductStatus } from "@prisma/client";
import {
  Plus,
  Search,
  Filter,
  Copy,
  Edit2,
  Archive,
  RotateCcw,
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface ProductRow {
  id: string;
  sku: string;
  name: string;
  price: number;
  offerPrice: number | null;
  isOfferActive: boolean;
  availability: ProductAvailability;
  status: ProductStatus;
  stock: number | null;
  imagePath: string | null;
  archivedAt: Date | null;
  category: {
    id: string;
    name: string;
  };
  merchType: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductsTableProps {
  products: ProductRow[];
  categories: CategoryOption[];
  totalCount: number;
}

export function ProductsTable({
  products,
  categories,
  totalCount,
}: ProductsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [batchAvailability, setBatchAvailability] =
    React.useState<ProductAvailability>("IN_STOCK");
  const [isBatchPending, setIsBatchPending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Search and filter state from URL
  const query = searchParams.get("q") || "";
  const selectedCategory = searchParams.get("category") || "";
  const selectedAvailability = searchParams.get("availability") || "";
  const selectedStatus = searchParams.get("status") || "ACTIVE";

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/products?${params.toString()}`);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(products.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDuplicate = async (id: string) => {
    setMessage(null);
    setError(null);
    const res = await duplicateProductAction(id);
    if (res.success) {
      setMessage(res.message || "Producto duplicado.");
      router.refresh();
    } else {
      setError(res.error || "Error al duplicar.");
    }
  };

  const handleArchive = async (id: string) => {
    setMessage(null);
    setError(null);
    const res = await archiveProductAction(id);
    if (res.success) {
      setMessage(res.message || "Producto archivado.");
      router.refresh();
    } else {
      setError(res.error || "Error al archivar.");
    }
  };

  const handleRestore = async (id: string) => {
    setMessage(null);
    setError(null);
    const res = await restoreProductAction(id);
    if (res.success) {
      setMessage(res.message || "Producto restaurado.");
      router.refresh();
    } else {
      setError(res.error || "Error al restaurar.");
    }
  };

  const handleBatchAvailability = async () => {
    if (selectedIds.length === 0) return;
    setIsBatchPending(true);
    setMessage(null);
    setError(null);

    const res = await batchUpdateAvailabilityAction(
      selectedIds,
      batchAvailability
    );
    setIsBatchPending(false);

    if (res.success) {
      setMessage(res.message || "Disponibilidad actualizada en lote.");
      setSelectedIds([]);
      router.refresh();
    } else {
      setError(res.error || "Error al actualizar en lote.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">
            Catálogo de Productos
          </h1>
          <p className="text-sm text-ink-secondary mt-1">
            Administra tus artículos de merch, precios, ofertas y disponibilidad
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/categories">
            <Button variant="outline" size="sm">
              <Layers className="w-4 h-4 mr-1.5" />
              Categorías
            </Button>
          </Link>
          <Link href="/admin/products/new">
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Nuevo producto
            </Button>
          </Link>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="font-bold ml-2">
            ×
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-ink-secondary/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                placeholder="Buscar por nombre o SKU..."
                defaultValue={query}
                onChange={(e) => updateFilters("q", e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => updateFilters("category", e.target.value)}
              aria-label="Filtrar por categoría"
              className="h-9 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Availability Filter */}
            <select
              value={selectedAvailability}
              onChange={(e) => updateFilters("availability", e.target.value)}
              aria-label="Filtrar por disponibilidad"
              className="h-9 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="ALL">Cualquier disponibilidad</option>
              {Object.entries(PRODUCT_AVAILABILITY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => updateFilters("status", e.target.value)}
              aria-label="Filtrar por estado"
              className="h-9 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="ACTIVE">Activos en catálogo</option>
              <option value="HIDDEN">Ocultos</option>
              <option value="ARCHIVED">Archivados (eliminados)</option>
              <option value="ALL">Todos los estados</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Batch Action Toolbar when items selected */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-cotton/80 border border-strawberry/30 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <span className="text-xs font-semibold text-strawberry">
            {selectedIds.length} producto(s) seleccionado(s)
          </span>
          <div className="flex items-center gap-2">
            <select
              value={batchAvailability}
              onChange={(e) =>
                setBatchAvailability(e.target.value as ProductAvailability)
              }
              aria-label="Seleccionar disponibilidad para lote"
              className="h-8 px-2.5 rounded-lg border border-pink-300 bg-white text-xs font-medium text-ink outline-hidden"
            >
              {Object.entries(PRODUCT_AVAILABILITY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleBatchAvailability}
              disabled={isBatchPending}
            >
              {isBatchPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  Aplicando...
                </>
              ) : (
                "Aplicar disponibilidad"
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-meringue/60 text-ink-secondary text-xs uppercase tracking-wider border-b border-pink-100">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar todos los productos"
                      checked={
                        products.length > 0 &&
                        selectedIds.length === products.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-pink-300 text-strawberry focus:ring-strawberry/20"
                    />
                  </th>
                  <th className="py-3 px-3">Producto</th>
                  <th className="py-3 px-3">Categoría</th>
                  <th className="py-3 px-3">Precio</th>
                  <th className="py-3 px-3">Disponibilidad</th>
                  <th className="py-3 px-3">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-ink-secondary">
                      <Package className="w-10 h-10 mx-auto text-strawberry/40 mb-2" />
                      <p className="font-semibold text-sm text-ink">
                        No se encontraron productos
                      </p>
                      <p className="text-xs mt-1">
                        Intenta ajustar los filtros de búsqueda o agrega un nuevo producto.
                      </p>
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const isSelected = selectedIds.includes(p.id);
                    const isArchived = !!p.archivedAt;

                    return (
                      <tr
                        key={p.id}
                        className={`hover:bg-cotton/20 transition-colors ${
                          isSelected ? "bg-cotton/30" : ""
                        } ${isArchived ? "opacity-60 bg-neutral-50/50" : ""}`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar producto ${p.name}`}
                            checked={isSelected}
                            onChange={() => handleSelectOne(p.id)}
                            className="rounded border-pink-300 text-strawberry focus:ring-strawberry/20"
                          />
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-pink-200/80 bg-meringue shrink-0">
                              {p.imagePath ? (
                                <Image
                                  src={`/api/files/${p.imagePath}`}
                                  alt={p.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-strawberry/30">
                                  <Package className="w-6 h-6" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/admin/products/${p.id}/edit`}
                                className="font-semibold text-ink hover:text-strawberry transition-colors truncate block"
                              >
                                {p.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-ink-secondary">
                                <span className="font-mono text-[11px]">
                                  {p.sku}
                                </span>
                                {p.merchType && (
                                  <>
                                    <span>•</span>
                                    <span>{p.merchType}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <Badge
                            variant="secondary"
                            className="bg-cotton/60 text-ink/80 border-none text-xs"
                          >
                            {p.category.name}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-3">
                          {p.isOfferActive && p.offerPrice ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-strawberry">
                                  {formatCurrency(p.offerPrice)}
                                </span>
                                <Sparkles className="w-3 h-3 text-strawberry fill-strawberry" />
                              </div>
                              <span className="text-[11px] text-ink-secondary line-through block">
                                {formatCurrency(p.price)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-ink">
                              {formatCurrency(p.price)}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {p.availability === "IN_STOCK" && (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              Disponible
                            </Badge>
                          )}
                          {p.availability === "ON_DEMAND" && (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-700 border-amber-200"
                            >
                              Bajo pedido
                            </Badge>
                          )}
                          {p.availability === "OUT_OF_STOCK" && (
                            <Badge
                              variant="outline"
                              className="bg-rose-50 text-rose-700 border-rose-200"
                            >
                              Agotado
                            </Badge>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {isArchived ? (
                            <Badge
                              variant="outline"
                              className="bg-neutral-100 text-neutral-600 border-neutral-300"
                            >
                              Archivado
                            </Badge>
                          ) : p.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                              Oculto
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/admin/products/${p.id}/edit`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Editar producto"
                                className="text-ink-secondary hover:text-ink"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                            </Link>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(p.id)}
                              title="Duplicar producto"
                              className="text-ink-secondary hover:text-strawberry"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>

                            {isArchived ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRestore(p.id)}
                                title="Restaurar producto"
                                className="text-emerald-600 hover:bg-emerald-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleArchive(p.id)}
                                title="Archivar producto"
                                className="text-ink-secondary hover:text-rose-600"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
