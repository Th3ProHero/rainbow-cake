"use client";

import { useState, useTransition } from "react";
import {
  Settings,
  MessageCircle,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Info,
  HelpCircle,
  Building,
  CreditCard,
  MapPin,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateSettingsAction,
  saveMessageTemplateAction,
  deleteMessageTemplateAction,
} from "@/actions/admin/settings";

export interface SerializedTemplate {
  id: string;
  name: string;
  body: string;
  isActive: boolean;
}

interface SettingsFormProps {
  initialSettings: Record<string, string>;
  templates: SerializedTemplate[];
}

export function SettingsForm({
  initialSettings,
  templates: initialTemplates,
}: SettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [templates, setTemplates] = useState<SerializedTemplate[]>(initialTemplates);
  const [activeTab, setActiveTab] = useState<"GENERAL" | "TEMPLATES">("GENERAL");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Template edit modal
  const [editingTemplate, setEditingTemplate] = useState<SerializedTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSettingsAction(settings);
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Configuración guardada." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error al guardar." });
      }
    });
  };

  const handleOpenNewTemplate = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateBody("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: SerializedTemplate) => {
    setEditingTemplate(tpl);
    setTemplateName(tpl.name);
    setTemplateBody(tpl.body);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (editingTemplate) {
      formData.append("id", editingTemplate.id);
    }
    formData.append("name", templateName);
    formData.append("body", templateBody);

    startTransition(async () => {
      const res = await saveMessageTemplateAction(formData);
      if (res.success) {
        if (editingTemplate) {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editingTemplate.id ? { ...t, name: templateName, body: templateBody } : t
            )
          );
        } else {
          setTemplates((prev) => [
            ...prev,
            { id: `temp-${Date.now()}`, name: templateName, body: templateBody, isActive: true },
          ]);
        }
        setFeedback({ type: "success", text: res.message || "Plantilla guardada." });
        setIsTemplateModalOpen(false);
      } else {
        setFeedback({ type: "error", text: res.error || "Error al guardar plantilla." });
      }
    });
  };

  const handleDeleteTemplate = (id: string) => {
    if (!confirm("¿Deseas eliminar esta plantilla de mensaje?")) return;
    startTransition(async () => {
      const res = await deleteMessageTemplateAction(id);
      if (res.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
        setFeedback({ type: "success", text: "Plantilla eliminada." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error al eliminar plantilla." });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Toast Alert Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-secondary hover:text-ink cursor-pointer ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border-light pb-2">
        <button
          onClick={() => setActiveTab("GENERAL")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "GENERAL"
              ? "bg-strawberry text-white shadow-xs"
              : "bg-white text-ink-secondary hover:bg-cotton/50 border border-border"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configuración del negocio</span>
        </button>

        <button
          onClick={() => setActiveTab("TEMPLATES")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
            activeTab === "TEMPLATES"
              ? "bg-strawberry text-white shadow-xs"
              : "bg-white text-ink-secondary hover:bg-cotton/50 border border-border"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span>Plantillas de WhatsApp ({templates.length})</span>
        </button>
      </div>

      {/* Tab 1: General Business Settings */}
      {activeTab === "GENERAL" && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="bg-white rounded-[20px] border border-border p-5 shadow-xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-ink flex items-center gap-2 border-b border-border-light pb-2">
              <Building className="w-4 h-4 text-strawberry" />
              Datos comerciales y de contacto
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-semibold text-ink">Nombre de la tienda / negocio</label>
                <Input
                  value={settings["BUSINESS_NAME"] || settings["STORE_NAME"] || "Rainbow Cake GO"}
                  onChange={(e) => handleSettingChange("BUSINESS_NAME", e.target.value)}
                  placeholder="Rainbow Cake GO"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-ink">
                  Teléfono de WhatsApp oficial (con código de país, ej. +5215512345678)
                </label>
                <Input
                  value={settings["WHATSAPP_PHONE"] || settings["WHATSAPP_BUSINESS_NUMBER"] || "+5215512345678"}
                  onChange={(e) => {
                    handleSettingChange("WHATSAPP_PHONE", e.target.value);
                    handleSettingChange("WHATSAPP_BUSINESS_NUMBER", e.target.value);
                  }}
                  placeholder="+5215512345678"
                  className="text-xs font-mono"
                />
                <p className="text-[11px] text-ink-secondary">
                  A este número se abrirán los enlaces wa.me que los clientes presionan al confirmar pedidos.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="font-semibold text-ink flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-strawberry" />
                Instrucciones y datos bancarios para transferencias / pagos
              </label>
              <Textarea
                rows={3}
                value={
                  settings["BANK_DETAILS"] ||
                  "Banco: BBVA\nCLABE: 012180000000000000\nBeneficiario: Rainbow Cake Oficial\nConcepto: Tu nombre y código de pedido"
                }
                onChange={(e) => handleSettingChange("BANK_DETAILS", e.target.value)}
                placeholder="Banco, CLABE, Beneficiario..."
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="font-semibold text-ink flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-strawberry" />
                Puntos y horarios para entregas presenciales
              </label>
              <Textarea
                rows={3}
                value={
                  settings["PICKUP_LOCATIONS"] ||
                  "Puntos de entrega habituales:\n- Metro Bellas Artes: Sábados 13:00 - 16:00 hrs\n- Metro Insurgentes: Domingos 12:00 - 15:00 hrs\n- Previa coordinación por WhatsApp"
                }
                onChange={(e) => handleSettingChange("PICKUP_LOCATIONS", e.target.value)}
                placeholder="Lugares y horarios acordados..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="font-semibold text-ink flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-strawberry" />
                Correos para notificaciones de nuevos pedidos
              </label>
              <Input
                value={settings["ADMIN_NOTIFY_EMAILS"] || ""}
                onChange={(e) => handleSettingChange("ADMIN_NOTIFY_EMAILS", e.target.value)}
                placeholder="admin@rainbowcakego.com, avisos@rainbowcakego.com"
                className="text-xs"
              />
              <p className="text-[11px] text-ink-secondary">
                Separados por comas si son varios.
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-strawberry hover:bg-strawberry-dark text-white gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isPending ? "Guardando..." : "Guardar cambios"}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Tab 2: WhatsApp Templates */}
      {activeTab === "TEMPLATES" && (
        <div className="space-y-4">
          <div className="bg-cotton/40 rounded-[18px] border border-bubblegum/30 p-3.5 text-xs text-ink-secondary flex items-start gap-2.5">
            <Info className="w-4 h-4 text-strawberry shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-ink">Variables dinámicas disponibles en plantillas:</p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-bubblegum/40 text-strawberry">
                  {"{nombre}"}
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-bubblegum/40 text-strawberry">
                  {"{pedido}"}
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-bubblegum/40 text-strawberry">
                  {"{producto}"}
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-bubblegum/40 text-strawberry">
                  {"{estado}"}
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded border border-bubblegum/40 text-strawberry">
                  {"{saldo}"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-ink">Plantillas configuradas</h3>
            <Button
              onClick={handleOpenNewTemplate}
              size="sm"
              className="text-xs bg-strawberry hover:bg-strawberry-dark text-white gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva plantilla</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white rounded-[18px] border border-border p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-border-light pb-2">
                    <span className="font-mono text-xs font-bold text-ink bg-cotton px-2 py-0.5 rounded">
                      {tpl.name}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {tpl.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-secondary mt-2.5 whitespace-pre-wrap leading-relaxed">
                    {tpl.body}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border-light">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditTemplate(tpl)}
                    className="text-xs h-7 px-2.5 text-ink hover:text-strawberry gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Editar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="text-xs h-7 px-2 text-ink-secondary hover:text-rose-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Edit Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveTemplate}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-strawberry" />
                {editingTemplate ? "Editar plantilla" : "Nueva plantilla de WhatsApp"}
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Escribe el texto que se pre-llenará al contactar al cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-ink">Identificador (slug único)</label>
                <Input
                  required
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                  placeholder="ej. llegada_almacen, recordatorio_pago"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Cuerpo del mensaje</label>
                <Textarea
                  rows={4}
                  required
                  value={templateBody}
                  onChange={(e) => setTemplateBody(e.target.value)}
                  placeholder="¡Hola {nombre}! Tu producto {producto} del pedido {pedido} ya está en almacén..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTemplateModalOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-strawberry hover:bg-strawberry-dark text-white"
              >
                {isPending ? "Guardando..." : "Guardar plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
