"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Newspaper,
  Calendar,
  Search,
  X,
  Sparkles,
  ArrowLeft,
  Share2,
  Check,
  Megaphone,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface UserNewsPost {
  id: string;
  title: string;
  body: string;
  imagePath: string | null;
  publishedAt: string;
}

interface NewsListViewProps {
  posts: UserNewsPost[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Justo ahora";
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return formatDate(iso);
}

export function NewsListView({ posts }: NewsListViewProps) {
  const [search, setSearch] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    alt: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredPosts = posts.filter((post) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      post.title.toLowerCase().includes(q) ||
      post.body.toLowerCase().includes(q)
    );
  });

  const handleShare = async (post: UserNewsPost) => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.body.slice(0, 100),
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${post.title}\n\n${shareUrl}`);
      setCopiedId(post.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="space-y-3">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-strawberry transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Catálogo</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cotton text-strawberry border border-pink-200 mb-2">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Comunicaciones Oficiales</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-ink tracking-tight">
              Noticias y Anuncios
            </h1>
            <p className="text-xs sm:text-sm text-ink-secondary mt-1">
              Entérate de las novedades, avisos de pedidos, fechas de arribo e información importante.
            </p>
          </div>

          {posts.length > 3 && (
            <div className="w-full sm:w-72">
              <div className="relative">
                <Search className="w-4 h-4 text-ink-secondary/50 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  placeholder="Buscar avisos o temas..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs sm:text-sm h-10 bg-white rounded-xl border-pink-200 shadow-2xs"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-secondary hover:text-ink"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Posts List */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/70 backdrop-blur-xs rounded-3xl border border-pink-200/80 shadow-2xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-pink-100 flex items-center justify-center text-strawberry mb-4">
            <Newspaper className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold font-display text-ink">
            {search ? "No se encontraron noticias" : "No hay avisos por ahora"}
          </h3>
          <p className="text-xs sm:text-sm text-ink-secondary max-w-sm mx-auto mt-1">
            {search
              ? "Prueba buscando con otras palabras clave."
              : "Cuando el equipo publique anuncios o informes importantes, aparecerán en esta sección."}
          </p>
          {search && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch("")}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Mostrar todas las noticias
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredPosts.map((post, idx) => (
            <article
              key={post.id}
              className="bg-white rounded-3xl border border-pink-200/80 shadow-xs hover:shadow-sm transition-all overflow-hidden flex flex-col md:flex-row"
            >
              {/* Image Preview if available */}
              {post.imagePath && (
                <div
                  onClick={() =>
                    setSelectedImage({
                      url: `/api/files/${post.imagePath}`,
                      alt: post.title,
                    })
                  }
                  className="relative md:w-5/12 lg:w-4/12 min-h-[220px] md:min-h-[260px] bg-pink-50 cursor-zoom-in group overflow-hidden"
                >
                  <Image
                    src={`/api/files/${post.imagePath}`}
                    alt={post.title}
                    fill
                    className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>
              )}

              {/* Text & Details */}
              <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between">
                <div className="space-y-3">
                  {/* Meta Bar */}
                  <div className="flex items-center justify-between text-xs text-ink-secondary gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 font-semibold text-strawberry bg-cotton px-2.5 py-0.5 rounded-full text-[11px]">
                        <Calendar className="w-3 h-3" />
                        {formatRelativeTime(post.publishedAt)}
                      </span>
                      {idx === 0 && (
                        <span className="hidden sm:inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          Más reciente
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleShare(post)}
                      aria-label="Compartir aviso"
                      className="p-1.5 rounded-lg text-ink-secondary hover:text-strawberry hover:bg-cotton/60 transition-colors"
                      title="Copiar o compartir enlace"
                    >
                      {copiedId === post.id ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Title */}
                  <h2 className="text-lg sm:text-xl font-extrabold font-display text-ink tracking-tight leading-snug">
                    {post.title}
                  </h2>

                  {/* Body with preserved formatting */}
                  <div className="text-xs sm:text-sm text-ink-secondary leading-relaxed whitespace-pre-line space-y-2">
                    {post.body}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-pink-100 flex items-center justify-between text-[11px] text-ink-secondary/70">
                  <span>Publicado el {formatDate(post.publishedAt)}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Lightbox / Image Zoom Modal */}
      {selectedImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 sm:right-0 p-2 text-white/80 hover:text-white transition-colors"
              aria-label="Cerrar imagen"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-[70vh] rounded-2xl overflow-hidden bg-black/30">
              <Image
                src={selectedImage.url}
                alt={selectedImage.alt}
                fill
                className="object-contain"
                sizes="90vw"
              />
            </div>
            <p className="text-xs text-white/80 text-center mt-3 font-medium">
              {selectedImage.alt}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
