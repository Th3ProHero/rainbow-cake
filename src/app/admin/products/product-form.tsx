"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createProductAction, updateProductAction, type ProductActionResult } from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  PRODUCT_AVAILABILITY_LABELS,
  PRODUCT_STATUS_LABELS,
} from "@/lib/constants";
import type { ProductAvailability, ProductStatus } from "@prisma/client";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Loader2,
  Tag,
  DollarSign,
  Calendar,
  Sparkles,
} from "lucide-react";

const MERCH_TYPE_SUGGESTIONS = [
  "Photocard",
  "Peluche",
  "Álbum",
  "Llavero",
  "Ropa",
  "Poster",
  "Lightstick",
  "Acrílico",
  "Taza",
  "Libreta",
  "Stickers",
  "Pin metálico",
  "Bolsa tote",
];

interface CategoryOption {
  id: string;
  name: string;
}

interface ProductFormProps {
  categories: CategoryOption[];
  initialData?: {
    id: string;
    sku: string;
    name: string;
    description?: string | null;
    categoryId: string;
    merchType?: string | null;
    price: number | string;
    offerPrice?: number | string | null;
    offerStartsAt?: Date | string | null;
    offerEndsAt?: Date | string | null;
    releaseDate?: Date | string | null;
    availability: ProductAvailability;
    status: ProductStatus;
    stock?: number | null;
    imagePath?: string | null;
  };
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditing = !!initialData;

  const [imagePreview, setImagePreview] = React.useState<string | null>(
    initialData?.imagePath ? `/api/files/${initialData.imagePath}` : null
  );
  const [removeImage, setRemoveImage] = React.useState(false);

  const actionFn = isEditing ? updateProductAction : createProductAction;
  const [state, formAction, isPending] = React.useActionState<
    ProductActionResult | null,
    FormData
  >(async (prev, formData) => {
    if (removeImage) {
      formData.set("removeImage", "true");
    }
    const res = await actionFn(prev, formData);
    if (res.success) {
      router.push("/admin/products");
    }
    return res;
  }, null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setRemoveImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setRemoveImage(true);
  };

  // Helper for date inputs formatted as YYYY-MM-DD
  const formatDateForInput = (d?: Date | string | null) => {
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : d;
    return date.toISOString().split("T")[0];
  };

  return (
    <form action={formAction} className="space-y-6">
      {isEditing && <input type="hidden" name="id" value={initialData.id} />}

      {state?.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General info & Pricing (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b border-pink-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-strawberry" />
                <span>Datos principales</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="name">Nombre del producto</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={initialData?.name || ""}
                    placeholder="Ej. Photocard Especial Primavera"
                    required
                    disabled={isPending}
                  />
                  {state?.fieldErrors?.name && (
                    <p className="text-xs text-rose-600">{state.fieldErrors.name}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sku">SKU (único)</Label>
                  <Input
                    id="sku"
                    name="sku"
                    defaultValue={initialData?.sku || ""}
                    placeholder="RCG-PC-001"
                    required
                    className="uppercase font-mono text-sm"
                    disabled={isPending}
                  />
                  {state?.fieldErrors?.sku && (
                    <p className="text-xs text-rose-600">{state.fieldErrors.sku}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="categoryId">Categoría</Label>
                  <select
                    id="categoryId"
                    name="categoryId"
                    defaultValue={initialData?.categoryId || categories[0]?.id || ""}
                    required
                    disabled={isPending}
                    className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-sm text-ink outline-hidden focus:border-strawberry focus:ring-2 focus:ring-strawberry/20"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {state?.fieldErrors?.categoryId && (
                    <p className="text-xs text-rose-600">{state.fieldErrors.categoryId}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="merchType">Tipo de merch</Label>
                  <Input
                    id="merchType"
                    name="merchType"
                    list="merch-suggestions"
                    defaultValue={initialData?.merchType || ""}
                    placeholder="Ej. Photocard, Peluche..."
                    disabled={isPending}
                  />
                  <datalist id="merch-suggestions">
                    {MERCH_TYPE_SUGGESTIONS.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={initialData?.description || ""}
                  placeholder="Detalles sobre el producto, acabados, medidas o características..."
                  rows={3}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Offers */}
          <Card>
            <CardHeader className="pb-3 border-b border-pink-100">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-strawberry" />
                <span>Precios y Ofertas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="price">Precio normal (MXN)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-secondary">
                      $
                    </span>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      defaultValue={initialData ? String(initialData.price) : ""}
                      placeholder="0.00"
                      required
                      className="pl-7"
                      disabled={isPending}
                    />
                  </div>
                  {state?.fieldErrors?.price && (
                    <p className="text-xs text-rose-600">{state.fieldErrors.price}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="offerPrice">Precio de oferta (opcional)</Label>
                    <Sparkles className="w-3.5 h-3.5 text-strawberry" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-secondary">
                      $
                    </span>
                    <Input
                      id="offerPrice"
                      name="offerPrice"
                      type="number"
                      step="0.01"
                      defaultValue={initialData?.offerPrice ? String(initialData.offerPrice) : ""}
                      placeholder="0.00"
                      className="pl-7"
                      disabled={isPending}
                    />
                  </div>
                  {state?.fieldErrors?.offerPrice && (
                    <p className="text-xs text-rose-600">{state.fieldErrors.offerPrice}</p>
                  )}
                </div>
              </div>

              {/* Offer dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="offerStartsAt" className="text-xs text-ink-secondary">
                    Inicio de oferta (opcional)
                  </Label>
                  <Input
                    id="offerStartsAt"
                    name="offerStartsAt"
                    type="date"
                    defaultValue={formatDateForInput(initialData?.offerStartsAt)}
                    disabled={isPending}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="offerEndsAt" className="text-xs text-ink-secondary">
                    Fin de oferta (opcional)
                  </Label>
                  <Input
                    id="offerEndsAt"
                    name="offerEndsAt"
                    type="date"
                    defaultValue={formatDateForInput(initialData?.offerEndsAt)}
                    disabled={isPending}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Image, Availability, Status & Delivery (1 col) */}
        <div className="space-y-6">
          {/* Image Upload Card */}
          <Card>
            <CardHeader className="pb-3 border-b border-pink-100">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-strawberry" />
                <span>Foto del producto</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {imagePreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-pink-200 aspect-square bg-meringue/60">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-rose-600 rounded-full shadow-md transition-all cursor-pointer"
                    aria-label="Eliminar imagen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-pink-200/80 rounded-2xl bg-meringue/30 hover:bg-cotton/20 transition-colors cursor-pointer p-4 text-center">
                  <Upload className="w-8 h-8 text-strawberry/60 mb-2" />
                  <span className="text-xs font-semibold text-ink">Subir imagen</span>
                  <span className="text-[11px] text-ink-secondary mt-1">
                    JPG, PNG o WebP (máx. 10 MB)
                  </span>
                  <input
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    disabled={isPending}
                    className="hidden"
                  />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Availability & Status */}
          <Card>
            <CardHeader className="pb-3 border-b border-pink-100">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-strawberry" />
                <span>Disponibilidad y estado</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="availability">Disponibilidad</Label>
                <select
                  id="availability"
                  name="availability"
                  defaultValue={initialData?.availability || "IN_STOCK"}
                  disabled={isPending}
                  className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-sm text-ink outline-hidden focus:border-strawberry focus:ring-2 focus:ring-strawberry/20"
                >
                  {Object.entries(PRODUCT_AVAILABILITY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Visibilidad en catálogo</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue={initialData?.status || "ACTIVE"}
                  disabled={isPending}
                  className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-sm text-ink outline-hidden focus:border-strawberry focus:ring-2 focus:ring-strawberry/20"
                >
                  {Object.entries(PRODUCT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stock">Stock disponible (informativo)</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  defaultValue={initialData?.stock !== null && initialData?.stock !== undefined ? String(initialData.stock) : ""}
                  placeholder="Ej. 10 (opcional)"
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="releaseDate">Fecha estimada de llegada</Label>
                <Input
                  id="releaseDate"
                  name="releaseDate"
                  type="date"
                  defaultValue={formatDateForInput(initialData?.releaseDate)}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-pink-200/60">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/products")}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando producto...
            </>
          ) : isEditing ? (
            "Guardar cambios"
          ) : (
            "Crear producto"
          )}
        </Button>
      </div>
    </form>
  );
}
