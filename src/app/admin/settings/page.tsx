import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SettingsForm, type SerializedTemplate } from "./settings-form";

export const metadata = {
  title: "Configuración | Admin Rainbow Cake GO",
  description: "Configuración del negocio, WhatsApp y plantillas de mensajes.",
};

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect("/login?redirectTo=/admin/settings");
  }

  const [dbSettings, dbTemplates] = await Promise.all([
    prisma.setting.findMany(),
    prisma.messageTemplate.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const settingsMap: Record<string, string> = {};
  for (const s of dbSettings) {
    settingsMap[s.key] = s.value;
  }

  const templates: SerializedTemplate[] = dbTemplates.map((t) => ({
    id: t.id,
    name: t.name,
    body: t.body,
    isActive: t.isActive,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-ink">
          Configuración y Plantillas
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Ajustes generales de la tienda, datos bancarios y plantillas para contacto por WhatsApp.
        </p>
      </div>

      <SettingsForm initialSettings={settingsMap} templates={templates} />
    </div>
  );
}
