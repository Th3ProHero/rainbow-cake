"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  ImageIcon,
  CalendarRange,
  MessageCircle,
  Tag,
  ArrowUpDown,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBannerAction,
  updateBannerAction,
  deleteBannerAction,
  toggleBannerAction,
} from "@/actions/admin/banners";
import { formatDateTime } from "@/lib/utils";

export interface SerializedBanner {
  id: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  merchType: string | null;
  ordersOpenAt: string | null;
  ordersCloseAt: string | null;
  whatsappMsg: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface BannersAdminProps {
  banners: SerializedBanner[];
  whatsappPhone: string;
}

export function BannersAdmin({ banners: initialBanners, whatsappPhone }: BannersAdminProps) {
  const [banners, setBanners] = useState<SerializedBanner[]>(initialBanners);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<SerializedBanner | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [merchType, setMerchType] = useState("");
  const [ordersOpenAt, setOrdersOpenAt] = useState("");
  const [ordersCloseAt, setOrdersCloseAt] = useState("");
  const [whatsappMsg, setWhatsappMsg] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setMerchType("");
    setOrdersOpenAt("");
    setOrdersCloseAt("");
    setWhatsappMsg("");
    setSortOrder("0");
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenNew = () => {
    setEditingBanner(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: SerializedBanner) => {
    setEditingBanner(banner);
    setTitle(banner.title);
    setDescription(banner.description || "");
    setMerchType(banner.merchType || "");
    setOrdersOpenAt(banner.ordersOpenAt ? banner.ordersOpenAt.slice(0, 16) : "");
    setOrdersCloseAt(banner.ordersCloseAt ? banner.ordersCloseAt.slice(0, 16) : "");
    setWhatsappMsg(banner.whatsappMsg || "");
    setSortOrder(String(banner.sortOrder));
    setPreviewUrl(banner.imagePath ? `/api/files/${banner.imagePath}` : null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();

    if (editingBanner) {
      formData.append("id", editingBanner.id);
    }
    formData.append("title", title);
    formData.append("description", description);
    formData.append("merchType", merchType);
    formData.append("ordersOpenAt", ordersOpenAt);
    formData.append("ordersCloseAt", ordersCloseAt);
    formData.append("whatsappMsg", whatsappMsg);
    formData.append("sortOrder", sortOrder);

    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      formData.append("image", fileInput.files[0]);
    }

    startTransition(async () => {
      const action = editingBanner ? updateBannerAction : createBannerAction;
      const res = await action(formData);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Guardado." });
        setIsModalOpen(false);
        // Reload from server
        window.location.reload();
      } else {
        setFeedback({ type: "error", text: res.error || "Error al guardar." });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Deseas eliminar este banner?")) return;
    startTransition(async () => {
      const res = await deleteBannerAction(id);
      if (res.success) {
        setBanners((prev) => prev.filter((b) => b.id !== id));
        setFeedback({ type: "success", text: "Banner eliminado." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error al eliminar." });
      }
    });
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const res = await toggleBannerAction(id);
      if (res.success) {
        setBanners((prev) =>
          prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
        );
        setFeedback({ type: "success", text: res.message || "Estado actualizado." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error." });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-secondary hover:text-ink cursor-pointer ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* WA Phone Info */}
      {whatsappPhone && (
        <div className="bg-cotton/40 rounded-[18px] border border-bubblegum/30 p-3.5 text-xs text-ink-secondary flex items-start gap-2.5">
          <MessageCircle className="w-4 h-4 text-strawberry shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-ink">
              Número de WhatsApp configurado:{" "}
              <span className="font-mono text-strawberry">{whatsappPhone}</span>
            </p>
            <p className="text-[11px] mt-0.5">
              Los usuarios contactarán a este número al solicitar informes desde los banners.
              Puedes cambiarlo en{" "}
              <a href="/admin/settings" className="text-strawberry underline">
                Configuración
              </a>.
            </p>
          </div>
        </div>
      )}

      {/* Header + Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-ink">
          Banners configurados ({banners.length})
        </h3>
        <Button
          onClick={handleOpenNew}
          size="sm"
          className="text-xs bg-strawberry hover:bg-strawberry-dark text-white gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nuevo banner</span>
        </Button>
      </div>

      {/* Banner List */}
      {banners.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border p-12 text-center space-y-3">
          <ImageIcon className="w-12 h-12 mx-auto text-strawberry/30" />
          <h3 className="font-bold text-base text-ink">Sin banners</h3>
          <p className="text-xs text-ink-secondary max-w-xs mx-auto">
            Crea tu primer banner promocional para que los usuarios lo vean en el catálogo.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {banners.map((banner) => {
            const now = new Date();
            const isOpen =
              banner.ordersOpenAt &&
              banner.ordersCloseAt &&
              new Date(banner.ordersOpenAt) <= now &&
              new Date(banner.ordersCloseAt) >= now;
            const isFuture = banner.ordersOpenAt && new Date(banner.ordersOpenAt) > now;

            return (
              <div
                key={banner.id}
                className={`bg-white rounded-[20px] border shadow-xs overflow-hidden transition-all ${
                  banner.isActive ? "border-border" : "border-border opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Image preview */}
                  <div className="relative w-full sm:w-48 h-32 sm:h-auto bg-meringue/40 shrink-0">
                    {banner.imagePath ? (
                      <Image
                        src={`/api/files/${banner.imagePath}`}
                        alt={banner.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-10 h-10 text-strawberry/20" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-ink">{banner.title}</h4>
                          {!banner.isActive && (
                            <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600">
                              Inactivo
                            </Badge>
                          )}
                          {isOpen && (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200">
                              Pedidos abiertos
                            </Badge>
                          )}
                          {isFuture && (
                            <Badge className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                              Próximamente
                            </Badge>
                          )}
                        </div>
                        {banner.description && (
                          <p className="text-xs text-ink-secondary line-clamp-2">
                            {banner.description}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-secondary font-mono bg-meringue px-2 py-0.5 rounded shrink-0">
                        <ArrowUpDown className="w-2.5 h-2.5 inline mr-0.5" />
                        {banner.sortOrder}
                      </span>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-secondary">
                      {banner.merchType && (
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-strawberry" />
                          {banner.merchType}
                        </span>
                      )}
                      {(banner.ordersOpenAt || banner.ordersCloseAt) && (
                        <span className="flex items-center gap-1">
                          <CalendarRange className="w-3 h-3 text-strawberry" />
                          {banner.ordersOpenAt ? formatDateTime(banner.ordersOpenAt) : "—"} →{" "}
                          {banner.ordersCloseAt ? formatDateTime(banner.ordersCloseAt) : "—"}
                        </span>
                      )}
                      {banner.whatsappMsg && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3 text-green-600" />
                          Plantilla WA configurada
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1.5 border-t border-border-light">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(banner)}
                        className="text-xs h-7 px-2.5 text-ink hover:text-strawberry gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Editar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggle(banner.id)}
                        className={`text-xs h-7 px-2.5 gap-1 ${
                          banner.isActive
                            ? "text-amber-600 hover:text-amber-700"
                            : "text-emerald-600 hover:text-emerald-700"
                        }`}
                      >
                        {banner.isActive ? (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Desactivar</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Activar</span>
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(banner.id)}
                        className="text-xs h-7 px-2 text-ink-secondary hover:text-rose-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-strawberry" />
                {editingBanner ? "Editar banner" : "Nuevo banner promocional"}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Configura la imagen, fechas de pedidos y mensaje de WhatsApp para el banner.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Título del banner *</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Pedidos de figuras Bandai - Noviembre 2026"
                  className="text-xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Descripción</label>
                <Textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descripción de la promoción o pedido..."
                  className="text-xs"
                />
              </div>

              {/* Merch Type */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Tipo de merch</label>
                <Input
                  value={merchType}
                  onChange={(e) => setMerchType(e.target.value)}
                  placeholder="Ej: Figuras, Peluches, Accesorios..."
                  className="text-xs"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-ink flex items-center gap-1">
                    <CalendarRange className="w-3 h-3 text-strawberry" />
                    Apertura de pedidos
                  </label>
                  <Input
                    type="datetime-local"
                    value={ordersOpenAt}
                    onChange={(e) => setOrdersOpenAt(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-ink flex items-center gap-1">
                    <CalendarRange className="w-3 h-3 text-strawberry" />
                    Cierre de pedidos
                  </label>
                  <Input
                    type="datetime-local"
                    value={ordersCloseAt}
                    onChange={(e) => setOrdersCloseAt(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              {/* WhatsApp Message Template */}
              <div className="space-y-1">
                <label className="font-semibold text-ink flex items-center gap-1">
                  <MessageCircle className="w-3 h-3 text-green-600" />
                  Mensaje plantilla de WhatsApp
                </label>
                <Textarea
                  rows={3}
                  value={whatsappMsg}
                  onChange={(e) => setWhatsappMsg(e.target.value)}
                  placeholder="Hola, me interesa información sobre los pedidos de {título}. ¿Podrían darme más detalles?"
                  className="text-xs"
                />
                <p className="text-[11px] text-ink-secondary">
                  Este texto se pre-llenará en WhatsApp cuando el usuario solicite informes.
                </p>
              </div>

              {/* Sort Order */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Orden de aparición</label>
                <Input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="text-xs w-24"
                  min="0"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="font-semibold text-ink">Imagen del banner</label>
                {previewUrl && (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden bg-meringue border border-border">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 bg-ink/70 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-ink cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-pink-200 rounded-xl p-4 text-center cursor-pointer hover:border-strawberry hover:bg-cotton/20 transition-colors"
                >
                  <Upload className="w-5 h-5 mx-auto text-strawberry/50 mb-1" />
                  <p className="text-[11px] text-ink-secondary">
                    Haz clic para subir una imagen (JPG, PNG, WebP)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-strawberry hover:bg-strawberry-dark text-white"
              >
                {isPending ? "Guardando..." : editingBanner ? "Guardar cambios" : "Crear banner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
