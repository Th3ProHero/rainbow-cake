"use client";

import * as React from "react";
import { updateProfileAction, changePasswordAction, logoutAction, type ActionResult } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PhoneInput } from "@/components/shared/phone-input";
import { CheckCircle2, AlertCircle, LogOut, Loader2, Shield, User as UserIcon } from "lucide-react";

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  whatsapp: string;
  createdAt: Date;
}

export function ProfileForm({ user }: { user: ProfileUser }) {
  // Profile update state
  const [profileState, profileAction, isProfilePending] = React.useActionState<
    ActionResult | null,
    FormData
  >(updateProfileAction, null);

  // Password change state
  const [passwordState, passwordFormAction, isPasswordPending] = React.useActionState<
    ActionResult | null,
    FormData
  >(changePasswordAction, null);

  return (
    <div className="space-y-6">
      {/* Account Info & Profile Form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-strawberry" />
            <CardTitle>Información personal</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {profileState?.message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{profileState.message}</span>
            </div>
          )}
          {profileState?.error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{profileState.error}</span>
            </div>
          )}

          <form action={profileAction} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-ink-secondary">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-meringue/60 text-ink/70 cursor-not-allowed"
                />
                <span className="text-[11px] text-ink-secondary/60">No se puede modificar</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-ink-secondary">
                  Nombre de usuario
                </Label>
                <Input
                  id="username"
                  value={user.username}
                  disabled
                  className="bg-meringue/60 text-ink/70 cursor-not-allowed"
                />
                <span className="text-[11px] text-ink-secondary/60">Identificador único</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                disabled={isProfilePending}
              />
              {profileState?.fieldErrors?.name && (
                <p className="text-xs text-rose-600">{profileState.fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="whatsapp">Teléfono de WhatsApp (obligatorio)</Label>
              <PhoneInput
                id="whatsapp"
                name="whatsapp"
                defaultValue={user.whatsapp}
                required
                disabled={isProfilePending}
                error={profileState?.fieldErrors?.whatsapp}
              />
              <span className="text-[11px] text-ink-secondary/70">
                Se usará para coordinar la entrega de tus artículos
              </span>
            </div>

            <Button
              type="submit"
              disabled={isProfilePending}
              className="mt-2"
            >
              {isProfilePending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando cambios...
                </>
              ) : (
                "Guardar cambios de perfil"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-strawberry" />
            <CardTitle>Seguridad y contraseña</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {passwordState?.message && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{passwordState.message}</span>
            </div>
          )}
          {passwordState?.error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{passwordState.error}</span>
            </div>
          )}

          <form action={passwordFormAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword">Contraseña actual</Label>
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                required
                disabled={isPasswordPending}
                placeholder="••••••••••"
              />
              {passwordState?.fieldErrors?.currentPassword && (
                <p className="text-xs text-rose-600">
                  {passwordState.fieldErrors.currentPassword}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">Nueva contraseña (mínimo 10 caracteres)</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                minLength={10}
                disabled={isPasswordPending}
                placeholder="••••••••••"
              />
              {passwordState?.fieldErrors?.newPassword && (
                <p className="text-xs text-rose-600">
                  {passwordState.fieldErrors.newPassword}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                minLength={10}
                disabled={isPasswordPending}
                placeholder="••••••••••"
              />
              {passwordState?.fieldErrors?.confirmPassword && (
                <p className="text-xs text-rose-600">
                  {passwordState.fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="outline"
              disabled={isPasswordPending}
              className="mt-2"
            >
              {isPasswordPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                "Cambiar contraseña"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Logout Card */}
      <Card className="border-pink-200/50">
        <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm text-ink">Cerrar sesión</h3>
            <p className="text-xs text-ink-secondary">
              Finaliza tu sesión en este dispositivo
            </p>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
