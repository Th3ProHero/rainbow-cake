"use client";

import * as React from "react";
import Link from "next/link";
import { requestPasswordResetAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Mail, ArrowLeft, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = React.useActionState<ActionResult | null, FormData>(
    requestPasswordResetAction,
    null
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-display text-ink">
          Recuperar contraseña
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Ingresa tu correo para recibir un enlace de restablecimiento
        </p>
      </div>

      {state?.message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      {state?.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      {!state?.message && (
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Correo electrónico</Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                required
                className="pl-10"
                disabled={isPending}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando enlace...
              </>
            ) : (
              "Enviar enlace de recuperación"
            )}
          </Button>
        </form>
      )}

      <div className="pt-2 text-center border-t border-pink-100">
        <Link
          href="/login"
          className="inline-flex items-center text-xs font-semibold text-strawberry hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
