"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/shared/phone-input";
import { AlertCircle, Lock, Mail, User, AtSign, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [phoneValid, setPhoneValid] = React.useState(false);
  const [state, formAction, isPending] = React.useActionState<ActionResult | null, FormData>(
    registerAction,
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
        <h1 className="text-2xl font-bold font-display text-ink">
          Crea tu cuenta
        </h1>
        <p className="mt-1 text-sm text-ink-secondary">
          Regístrate para hacer tus pedidos y coordinar por WhatsApp
        </p>
      </div>

      {state?.error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre completo</Label>
          <div className="relative">
            <User className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre y apellido"
              required
              className="pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.name && (
            <p className="text-xs text-rose-600">{state.fieldErrors.name}</p>
          )}
        </div>

        {/* Email */}
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
          {state?.fieldErrors?.email && (
            <p className="text-xs text-rose-600">{state.fieldErrors.email}</p>
          )}
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <Label htmlFor="username">Nombre de usuario</Label>
          <div className="relative">
            <AtSign className="w-4 h-4 text-ink-secondary/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              placeholder="tu_usuario"
              required
              className="pl-10"
              disabled={isPending}
            />
          </div>
          {state?.fieldErrors?.username && (
            <p className="text-xs text-rose-600">{state.fieldErrors.username}</p>
          )}
        </div>

        {/* WhatsApp Phone Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="phone-input">Teléfono de WhatsApp (obligatorio)</Label>
            <span className="text-[11px] text-ink-secondary/70">Solo para coordinar entregas</span>
          </div>
          <PhoneInput
            id="phone-input"
            name="whatsapp"
            required
            disabled={isPending}
            onChange={(_e164, valid) => setPhoneValid(valid)}
            error={state?.fieldErrors?.whatsapp}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña (mínimo 10 caracteres)</Label>
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

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
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
              Creando cuenta...
            </>
          ) : (
            "Crear mi cuenta"
          )}
        </Button>
      </form>

      <div className="pt-2 text-center border-t border-pink-100 text-xs text-ink-secondary">
        ¿Ya tienes cuenta?{" "}
        <Link
          href="/login"
          className="font-semibold text-strawberry hover:underline"
        >
          Inicia sesión
        </Link>
      </div>
    </div>
  );
}
