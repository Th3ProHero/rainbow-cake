"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Calendar,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PromoBannerData {
  id: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  merchType: string | null;
  ordersOpenAt: string | null;
  ordersCloseAt: string | null;
  whatsappMsg: string | null;
}

interface PromoBannersProps {
  banners: PromoBannerData[];
  whatsappPhone: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getPeriodStatus(openAt: string | null, closeAt: string | null) {
  const now = new Date().getTime();
  const openTime = openAt ? new Date(openAt).getTime() : null;
  const closeTime = closeAt ? new Date(closeAt).getTime() : null;

  if (openTime && now < openTime) {
    return {
      status: "UPCOMING",
      label: `Abre el ${formatDate(openAt)}`,
      badgeText: "Próximamente",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300",
      dotColor: "bg-amber-500",
      canOrder: false,
    };
  }

  if (closeTime && now > closeTime) {
    return {
      status: "CLOSED",
      label: `Cerró el ${formatDate(closeAt)}`,
      badgeText: "Periodo Cerrado",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-300",
      dotColor: "bg-slate-400",
      canOrder: false,
    };
  }

  // Active period
  if (closeTime) {
    const diffHours = (closeTime - now) / (1000 * 60 * 60);
    const diffDays = Math.ceil(diffHours / 24);

    if (diffDays <= 2 && diffDays > 0) {
      return {
        status: "CLOSING_SOON",
        label: `Cierra en ${diffDays === 1 ? "1 día" : `${diffDays} días`} (${formatDate(closeAt)})`,
        badgeText: "¡Últimos días!",
        badgeColor: "bg-rose-100 text-rose-800 border-rose-300 animate-pulse",
        dotColor: "bg-rose-500",
        canOrder: true,
      };
    }

    return {
      status: "OPEN",
      label: `Abierto hasta el ${formatDate(closeAt)}`,
      badgeText: "Pedidos Abiertos",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      dotColor: "bg-emerald-500",
      canOrder: true,
    };
  }

  if (openTime) {
    return {
      status: "OPEN",
      label: `Abierto desde el ${formatDate(openAt)}`,
      badgeText: "Pedidos Abiertos",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300",
      dotColor: "bg-emerald-500",
      canOrder: true,
    };
  }

  return {
    status: "OPEN",
    label: "Aceptando pedidos",
    badgeText: "Informes Disponibles",
    badgeColor: "bg-pink-100 text-strawberry border-pink-300",
    dotColor: "bg-strawberry",
    canOrder: true,
  };
}

export function PromoBanners({ banners, whatsappPhone }: PromoBannersProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const cleanPhone = (whatsappPhone || "").replace(/[^\d]/g, "");

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Autoplay
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(timer);
  }, [banners.length, isPaused, handleNext]);

  if (!banners || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  const period = getPeriodStatus(
    currentBanner.ordersOpenAt,
    currentBanner.ordersCloseAt
  );

  // WhatsApp link construction
  let defaultMsg = `¡Hola! Me interesa solicitar información sobre el pedido de: ${currentBanner.title}`;
  if (currentBanner.merchType) {
    defaultMsg += ` (${currentBanner.merchType})`;
  }
  defaultMsg += `. ¿Me podrías compartir más detalles?`;

  const finalMsg = currentBanner.whatsappMsg?.trim()
    ? currentBanner.whatsappMsg
        .replace(/\{titulo\}/gi, currentBanner.title)
        .replace(/\{merch\}/gi, currentBanner.merchType || "merch")
    : defaultMsg;

  const whatsappHref = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(finalMsg)}`;

  // Swipe handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  return (
    <section
      aria-label="Banners promocionales"
      className="relative mb-6 rounded-3xl overflow-hidden border border-pink-200/80 bg-gradient-to-br from-white via-meringue/40 to-cotton/30 shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative min-h-[260px] sm:min-h-[240px] flex flex-col md:flex-row items-stretch">
        {/* Visual / Image Side */}
        {currentBanner.imagePath ? (
          <div className="relative w-full md:w-5/12 lg:w-1/2 min-h-[180px] sm:min-h-[220px] md:min-h-full overflow-hidden bg-pink-100/60 order-1 md:order-2">
            <Image
              src={`/api/files/${currentBanner.imagePath}`}
              alt={currentBanner.title}
              fill
              className="object-cover object-center transition-all duration-700 ease-out"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* Subtle gradient overlay to merge into content */}
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-l from-transparent via-transparent to-white/40 md:to-white pointer-events-none" />
          </div>
        ) : (
          <div className="relative w-full md:w-5/12 lg:w-1/2 min-h-[140px] md:min-h-full bg-gradient-to-br from-cotton via-pink-100 to-meringue flex items-center justify-center p-6 order-1 md:order-2">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white/80 shadow-xs flex items-center justify-center text-strawberry">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <span className="text-xs font-semibold text-ink-secondary block">
                Rainbow Cake GO • Pedidos Especiales
              </span>
            </div>
          </div>
        )}

        {/* Content Side */}
        <div className="flex-1 p-5 sm:p-7 flex flex-col justify-between order-2 md:order-1 z-10">
          <div className="space-y-3">
            {/* Badges: Merch type + Period Status */}
            <div className="flex flex-wrap items-center gap-2">
              {currentBanner.merchType && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-cotton text-strawberry border border-pink-200">
                  <Sparkles className="w-3 h-3 text-strawberry" />
                  {currentBanner.merchType}
                </span>
              )}

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${period.badgeColor}`}
              >
                <span className="relative flex h-2 w-2">
                  {period.status === "OPEN" || period.status === "CLOSING_SOON" ? (
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${period.dotColor}`}
                    />
                  ) : null}
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${period.dotColor}`}
                  />
                </span>
                {period.badgeText}
              </span>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold font-display text-ink tracking-tight line-clamp-2">
                {currentBanner.title}
              </h2>
              {currentBanner.description && (
                <p className="text-xs sm:text-sm text-ink-secondary mt-1 line-clamp-2 sm:line-clamp-3">
                  {currentBanner.description}
                </p>
              )}
            </div>

            {/* Date timeline pill */}
            <div className="flex items-center gap-2 text-xs font-medium text-ink-secondary bg-white/70 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-pink-100 w-fit">
              <Calendar className="w-3.5 h-3.5 text-strawberry shrink-0" />
              <span>{period.label}</span>
            </div>
          </div>

          {/* WhatsApp CTA Action */}
          <div className="mt-5 pt-3 border-t border-pink-100/80 flex flex-wrap items-center justify-between gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-95 shadow-sm hover:shadow-md transition-all"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Solicitar Informes por WhatsApp</span>
            </a>

            {banners.length > 1 && (
              <span className="text-[11px] font-medium text-ink-secondary/70">
                {currentIndex + 1} de {banners.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation arrows (desktop & tablet) */}
      {banners.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Banner anterior"
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-ink border border-pink-200/80 shadow-sm items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
          >
            <ChevronLeft className="w-5 h-5 text-ink" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Siguiente banner"
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-ink border border-pink-200/80 shadow-sm items-center justify-center hover:scale-105 active:scale-95 transition-all z-20"
          >
            <ChevronRight className="w-5 h-5 text-ink" />
          </button>
        </>
      )}

      {/* Dot Indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 bg-white/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-pink-100 shadow-2xs">
          {banners.map((b, idx) => (
            <button
              key={b.id}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Ir al banner ${idx + 1}`}
              className={`transition-all rounded-full ${
                idx === currentIndex
                  ? "w-5 h-1.5 bg-strawberry"
                  : "w-1.5 h-1.5 bg-pink-300 hover:bg-pink-400"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
