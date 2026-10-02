"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Newspaper,
  Calendar,
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
  createNewsAction,
  updateNewsAction,
  deleteNewsAction,
  toggleNewsAction,
} from "@/actions/admin/news";
import { formatDateTime } from "@/lib/utils";

export interface SerializedNewsPost {
  id: string;
  title: string;
  body: string;
  imagePath: string | null;
  isPublished: boolean;
  publishedAt: string;
}

interface NewsAdminProps {
  posts: SerializedNewsPost[];
}

export function NewsAdmin({ posts: initialPosts }: NewsAdminProps) {
  const [posts, setPosts] = useState<SerializedNewsPost[]>(initialPosts);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SerializedNewsPost | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setPublishedAt("");
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleOpenNew = () => {
    setEditingPost(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (post: SerializedNewsPost) => {
    setEditingPost(post);
    setTitle(post.title);
    setBody(post.body);
    setPublishedAt(post.publishedAt.slice(0, 16));
    setPreviewUrl(post.imagePath ? `/api/files/${post.imagePath}` : null);
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

    if (editingPost) {
      formData.append("id", editingPost.id);
    }
    formData.append("title", title);
    formData.append("body", body);
    formData.append("publishedAt", publishedAt);

    const fileInput = fileInputRef.current;
    if (fileInput?.files?.[0]) {
      formData.append("image", fileInput.files[0]);
    }

    startTransition(async () => {
      const action = editingPost ? updateNewsAction : createNewsAction;
      const res = await action(formData);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Guardado." });
        setIsModalOpen(false);
        window.location.reload();
      } else {
        setFeedback({ type: "error", text: res.error || "Error al guardar." });
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Deseas eliminar esta noticia?")) return;
    startTransition(async () => {
      const res = await deleteNewsAction(id);
      if (res.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setFeedback({ type: "success", text: "Noticia eliminada." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error al eliminar." });
      }
    });
  };

  const handleToggle = (id: string) => {
    startTransition(async () => {
      const res = await toggleNewsAction(id);
      if (res.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, isPublished: !p.isPublished } : p))
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

      {/* Header + Create Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-ink">
          Noticias publicadas ({posts.length})
        </h3>
        <Button
          onClick={handleOpenNew}
          size="sm"
          className="text-xs bg-strawberry hover:bg-strawberry-dark text-white gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva noticia</span>
        </Button>
      </div>

      {/* News List */}
      {posts.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border p-12 text-center space-y-3">
          <Newspaper className="w-12 h-12 mx-auto text-strawberry/30" />
          <h3 className="font-bold text-base text-ink">Sin noticias</h3>
          <p className="text-xs text-ink-secondary max-w-xs mx-auto">
            Publica tu primera noticia o anuncio para que los usuarios la vean.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className={`bg-white rounded-[20px] border shadow-xs overflow-hidden flex flex-col ${
                post.isPublished ? "border-border" : "border-border opacity-60"
              }`}
            >
              {/* Image */}
              {post.imagePath && (
                <div className="relative w-full h-36 bg-meringue/40">
                  <Image
                    src={`/api/files/${post.imagePath}`}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              <div className="p-4 flex-1 flex flex-col space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-ink">{post.title}</h4>
                      {!post.isPublished && (
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                          Borrador
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-ink-secondary line-clamp-3 whitespace-pre-wrap">
                      {post.body}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-ink-secondary flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-strawberry" />
                  {formatDateTime(post.publishedAt)}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1.5 border-t border-border-light mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(post)}
                    className="text-xs h-7 px-2.5 text-ink hover:text-strawberry gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(post.id)}
                    className={`text-xs h-7 px-2.5 gap-1 ${
                      post.isPublished
                        ? "text-amber-600 hover:text-amber-700"
                        : "text-emerald-600 hover:text-emerald-700"
                    }`}
                  >
                    {post.isPublished ? (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Despublicar</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Publicar</span>
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(post.id)}
                    className="text-xs h-7 px-2 text-ink-secondary hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-strawberry" />
                {editingPost ? "Editar noticia" : "Nueva noticia"}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Publica una comunicación general para todos los usuarios.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Título *</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Actualización de horarios de entrega"
                  className="text-xs"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Contenido *</label>
                <Textarea
                  rows={5}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Escribe el contenido de la noticia..."
                  className="text-xs"
                />
              </div>

              {/* Published At */}
              <div className="space-y-1">
                <label className="font-semibold text-ink flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-strawberry" />
                  Fecha de publicación
                </label>
                <Input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-ink-secondary">
                  Si no la especificas, se usará la fecha y hora actual.
                </p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="font-semibold text-ink">Imagen (opcional)</label>
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
                {isPending ? "Guardando..." : editingPost ? "Guardar cambios" : "Publicar noticia"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
