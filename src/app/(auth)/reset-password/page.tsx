"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [state, formAction, isPending] = React.useActionState<ActionResult | null, FormData>(
    resetPasswordAction,
    null
  );

  React.useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-bold font-display text-ink">
          Enlace no válido
        </h1>
        <p className="text-sm text-ink-secondary">
          No se encontró un token válido para restablecer la contraseña.
        </p>
        <Link href="/forgot-password">
          <Button variant="outline" className="w-full">
            Solicitar nuevo enlace
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-display text-ink">
          Nueva contraseña
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Ingresa tu nueva contraseña para acceder a tu cuenta
        </p>
      </div>

      {state?.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-1.5">
          <Label htmlFor="password">Nueva contraseña (mínimo 10 caracteres)</Label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••"
              required
              minLength={10}
              className="pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.password && (
            <p className="text-xs text-rose-600">{state.fieldErrors.password}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••"
              required
              minLength={10}
              className="pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.confirmPassword && (
            <p className="text-xs text-rose-600">{state.fieldErrors.confirmPassword}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Guardando contraseña...
            </>
          ) : (
            "Guardar nueva contraseña"
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense fallback={
      <div className="space-y-6 animate-pulse">
        <div className="text-center">
          <div className="h-8 bg-pink-100 rounded w-48 mx-auto mb-2"></div>
          <div className="h-4 bg-pink-50 rounded w-64 mx-auto"></div>
        </div>
        <div className="space-y-4">
          <div className="h-10 bg-pink-50 rounded"></div>
          <div className="h-10 bg-pink-50 rounded"></div>
          <div className="h-10 bg-pink-100 rounded"></div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </React.Suspense>
  );
}
