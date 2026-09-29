"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Lock, ShieldCheck, Loader2 } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [state, formAction, isPending] = React.useActionState<ActionResult | null, FormData>(
    changePasswordAction,
    null
  );

  React.useEffect(() => {
    if (state?.success && state.redirectUrl) {
      router.push(state.redirectUrl);
    }
  }, [state, router]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-cotton flex items-center justify-center text-strawberry mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold font-display text-ink">
          Cambio de contraseña
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Por seguridad, debes crear una nueva contraseña antes de continuar
        </p>
      </div>

      {state?.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Nueva contraseña (mínimo 10 caracteres)</Label>
          <div className="relative">
            <Lock className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••••"
              required
              minLength={10}
              className="pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.newPassword && (
            <p className="text-xs text-rose-600">{state.fieldErrors.newPassword}</p>
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
              Actualizando contraseña...
            </>
          ) : (
            "Actualizar y continuar"
          )}
        </Button>
      </form>
    </div>
  );
}
