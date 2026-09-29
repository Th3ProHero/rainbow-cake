"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, User, Loader2, KeyRound } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "";
  const resetSuccess = searchParams.get("reset") === "success";

  const [identifierValue, setIdentifierValue] = React.useState("");
  const [passwordValue, setPasswordValue] = React.useState("");

  const [state, formAction, isPending] = React.useActionState<ActionResult | null, FormData>(
    loginAction,
    null
  );

  React.useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  const fillAdmin = () => {
    setIdentifierValue("admin@rainbowcakego.com");
    setPasswordValue("CambiarEnPrimerAcceso2024!");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-display text-ink">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Accede para ver tus pedidos o administrar la tienda
        </p>
      </div>

      {resetSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          Tu contraseña ha sido actualizada exitosamente. Inicia sesión con tus nuevos datos.
        </div>
      )}

      {/* Helpful developer credentials button */}
      <div className="p-3 bg-cotton/40 border border-pink-200/80 rounded-xl text-xs flex items-center justify-between text-ink-secondary">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-strawberry shrink-0" />
          <div>
            <span className="font-semibold text-ink block text-[11px]">Acceso Administrador (Seed):</span>
            <span className="font-mono text-[10px] text-strawberry">admin@rainbowcakego.com</span>
          </div>
        </div>
        <button
          type="button"
          onClick={fillAdmin}
          className="text-xs bg-white border border-pink-200 text-strawberry font-semibold px-2.5 py-1 rounded-lg hover:bg-meringue transition-colors cursor-pointer shadow-2xs"
        >
          Autollenar
        </button>
      </div>

      {state?.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="from" value={from} />

        <div className="space-y-1.5">
          <Label htmlFor="identifier">Correo o nombre de usuario</Label>
          <div className="relative">
            <User className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              placeholder="tu@correo.com o tu_usuario"
              required
              value={identifierValue}
              onChange={(e) => setIdentifierValue(e.target.value)}
              className="pl-10"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Contraseña</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-strawberry hover:underline font-medium"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••"
              required
              value={passwordValue}
              onChange={(e) => setPasswordValue(e.target.value)}
              className="pl-10"
              disabled={isPending}
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Iniciando sesión...
            </>
          ) : (
            "Iniciar sesión"
          )}
        </Button>
      </form>

      <div className="pt-2 text-center border-t border-pink-100 text-xs text-ink-secondary">
        ¿Primera vez aquí?{" "}
        <Link
          href="/register"
          className="font-semibold text-strawberry hover:underline"
        >
          Crea tu cuenta
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="text-center">
          <div className="h-8 bg-pink-100 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-pink-50 rounded w-64 mx-auto"></div>
        </div>
        <div className="h-16 bg-pink-50 rounded-xl"></div>
        <div className="space-y-4">
          <div className="h-10 bg-pink-50 rounded"></div>
          <div className="h-10 bg-pink-50 rounded"></div>
          <div className="h-10 bg-pink-100 rounded"></div>
        </div>
      </div>
    }>
      <LoginForm />
    </React.Suspense>
  );
}
