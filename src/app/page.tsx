import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-dvh px-6 py-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center max-w-md space-y-8">
        {/* Logo */}
        <Logo size="lg" />

        {/* Tagline */}
        <div className="space-y-3">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-ink leading-tight">
            Tu merch favorito,{" "}
            <span className="text-strawberry">sin complicaciones</span>
          </h1>
          <p className="text-ink-secondary text-base sm:text-lg leading-relaxed max-w-sm mx-auto">
            Explora el catálogo, haz tu pedido y sigue cada artículo hasta que
            llegue a tus manos.
          </p>
        </div>

        {/* Status badges demo */}
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="pending">Pendiente</Badge>
          <Badge variant="inTransit">En tránsito</Badge>
          <Badge variant="inWarehouse">En almacén</Badge>
          <Badge variant="delivered">Entregado</Badge>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/catalog">Ver catálogo</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </div>

        {/* Subtle note */}
        <p className="text-xs text-ink-secondary/60">
          ¿Primera vez aquí?{" "}
          <Link
            href="/register"
            className="text-strawberry hover:underline underline-offset-2"
          >
            Crea tu cuenta
          </Link>
        </p>
      </div>

      {/* Decorative bottom element */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cotton via-strawberry to-bubblegum" />
    </main>
  );
}
