"use client";

import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface AboutSectionProps {
  whatsappPhone?: string;
}

export function AboutSection({ whatsappPhone = "" }: AboutSectionProps) {
  const handleWhatsAppClick = () => {
    const message = "Hola! Me gustaría obtener más información sobre los productos de Rainbow Cake GO.";
    const url = buildWhatsAppLink(whatsappPhone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleFacebookClick = () => {
    window.open(
      "https://www.facebook.com/share/g/14uR51KJ7ih/?mibextid=wwXIfr",
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="bg-gradient-to-br from-cotton/40 via-meringue/30 to-bubblegum/20 rounded-3xl border border-pink-200/70 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-ink">
          Acerca de Rainbow Cake GO
        </h2>
        <p className="text-sm sm:text-base text-ink-secondary max-w-2xl mx-auto">
          Desde <span className="font-bold text-strawberry">2022</span>, conectamos a fans con merch exclusivo 
          de sus artistas favoritos. Pedidos grupales, entregas coordinadas y una comunidad apasionada.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-center border border-pink-100/50">
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-strawberry">2022</div>
          <div className="text-[11px] sm:text-xs text-ink-secondary font-medium mt-1">Año de inicio</div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-center border border-pink-100/50">
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-strawberry">100%</div>
          <div className="text-[11px] sm:text-xs text-ink-secondary font-medium mt-1">Transparencia</div>
        </div>
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-center border border-pink-100/50">
          <div className="text-2xl sm:text-3xl font-extrabold font-display text-strawberry">🌈</div>
          <div className="text-[11px] sm:text-xs text-ink-secondary font-medium mt-1">Comunidad</div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
        <Button
          onClick={handleWhatsAppClick}
          className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-sm"
          disabled={!whatsappPhone}
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Contactar por WhatsApp
        </Button>
        
        <Button
          onClick={handleFacebookClick}
          className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-sm"
        >
          <Users className="w-5 h-5 mr-2" />
          Únete al grupo
        </Button>
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-ink-secondary/70 max-w-md mx-auto">
        ¿Tienes dudas sobre un pedido, fechas de entrega o disponibilidad? 
        Contáctanos por WhatsApp o únete a nuestro grupo de Facebook para estar al día con anuncios y novedades.
      </p>
    </div>
  );
}
