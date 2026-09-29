"use client";

import { useState, useTransition, useMemo } from "react";
import {
  MessageCircle,
  Search,
  Filter,
  ExternalLink,
  CheckCircle2,
  Clock,
  Send,
  Users,
  Package,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { logWhatsAppContactAction } from "@/actions/admin/settings";
import { buildWhatsAppLink, fillMessageTemplate } from "@/lib/whatsapp";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateAmountDue, calculateTotalPaid, calculateBalance } from "@/lib/domain/payment";
import { ORDER_ITEM_STATUS_LABELS } from "@/lib/constants";
import type { OrderItemStatus } from "@prisma/client";

export interface UserForBroadcast {
  id: string;
  name: string;
  email: string;
  phone: string;
  items: {
    id: string;
    orderCode: string;
    snapshotName: string;
    snapshotSku: string;
    snapshotUnitPrice: number;
    quantity: number;
    quantityCancelled: number;
    status: string;
    allocations: { amountApplied: number }[];
  }[];
}

export interface BroadcastTemplate {
  id: string;
  name: string;
  body: string;
}

export interface RecentContactLog {
  id: string;
  userName: string;
  userPhone: string;
  adminName: string;
  message: string;
  createdAt: string;
}

interface WhatsAppBroadcastViewProps {
  users: UserForBroadcast[];
  templates: BroadcastTemplate[];
  recentLogs: RecentContactLog[];
}

export function WhatsAppBroadcastView({
  users,
  templates,
  recentLogs: initialLogs,
}: WhatsAppBroadcastViewProps) {
  const [recentLogs, setRecentLogs] = useState<RecentContactLog[]>(initialLogs);
  const [selectedAudience, setSelectedAudience] = useState<
    "ALL" | "IN_WAREHOUSE" | "IN_TRANSIT" | "PENDING_BALANCE"
  >("IN_WAREHOUSE");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || ""
  );
  const [customMessage, setCustomMessage] = useState<string>(templates[0]?.body || "");
  const [search, setSearch] = useState("");
  const [contactedIds, setContactedIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  // Switch template
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = templates.find((t) => t.id === templateId);
    if (found) {
      setCustomMessage(found.body);
    }
  };

  // Filter users based on audience
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          u.name.toLowerCase().includes(q) ||
          u.phone.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedAudience === "ALL") return true;

      if (selectedAudience === "IN_WAREHOUSE") {
        return u.items.some((i) => i.status === "IN_WAREHOUSE");
      }

      if (selectedAudience === "IN_TRANSIT") {
        return u.items.some((i) => i.status === "IN_TRANSIT");
      }

      if (selectedAudience === "PENDING_BALANCE") {
        return u.items.some((i) => {
          if (i.status === "CANCELLED") return false;
          const balance = calculateBalance(
            {
              quantity: i.quantity,
              quantityCancelled: i.quantityCancelled,
              snapshotUnitPrice: i.snapshotUnitPrice,
            },
            i.allocations
          );
          return balance > 0;
        });
      }

      return true;
    });
  }, [users, search, selectedAudience]);

  // Click WhatsApp contact
  const handleContact = (user: UserForBroadcast, finalMessage: string) => {
    const waUrl = buildWhatsAppLink(user.phone, finalMessage);

    // Open WhatsApp in new tab
    window.open(waUrl, "_blank", "noopener,noreferrer");

    // Log the contact event
    startTransition(async () => {
      const firstItem = user.items[0];
      await logWhatsAppContactAction(user.id, firstItem?.id || null, finalMessage);
      setContactedIds((prev) => ({ ...prev, [user.id]: true }));
      setRecentLogs((prev) => [
        {
          id: `local-${Date.now()}`,
          userName: user.name,
          userPhone: user.phone,
          adminName: "Admin",
          message: finalMessage,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    });
  };

  return (
    <div className="space-y-6">
      {/* Configuration Strip: Audience & Template */}
      <div className="bg-white rounded-[22px] border border-border p-4 sm:p-5 shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Audience Filter */}
          <div className="space-y-1.5">
            <label className="font-semibold text-ink flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-strawberry" />
              Filtrar destinatarios por situación
            </label>
            <select
              value={selectedAudience}
              onChange={(e) => setSelectedAudience(e.target.value as any)}
              aria-label="Filtrar destinatarios"
              className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="IN_WAREHOUSE">
                📦 Con artículos en almacén (listos para entrega)
              </option>
              <option value="IN_TRANSIT">
                ✈️ Con artículos en tránsito
              </option>
              <option value="PENDING_BALANCE">
                💳 Con saldo pendiente por liquidar
              </option>
              <option value="ALL">
                👥 Todos los clientes registrados
              </option>
            </select>
          </div>

          {/* Template Selector */}
          <div className="space-y-1.5">
            <label className="font-semibold text-ink flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-strawberry" />
              Plantilla de mensaje
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              aria-label="Seleccionar plantilla de mensaje"
              className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <label className="font-semibold text-ink">
            Cuerpo del mensaje (puedes ajustar el texto antes de enviar)
          </label>
          <Textarea
            rows={3}
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            className="text-xs"
          />
          <div className="flex flex-wrap gap-1 text-[11px] text-ink-secondary pt-1">
            <span>Variables:</span>
            <span className="font-mono bg-cotton text-strawberry px-1.5 py-0.2 rounded">
              {"{nombre}"}
            </span>
            <span className="font-mono bg-cotton text-strawberry px-1.5 py-0.2 rounded">
              {"{pedido}"}
            </span>
            <span className="font-mono bg-cotton text-strawberry px-1.5 py-0.2 rounded">
              {"{producto}"}
            </span>
            <span className="font-mono bg-cotton text-strawberry px-1.5 py-0.2 rounded">
              {"{estado}"}
            </span>
            <span className="font-mono bg-cotton text-strawberry px-1.5 py-0.2 rounded">
              {"{saldo}"}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Count */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o teléfono..."
            className="pl-9 h-9 text-xs bg-white border-pink-200/80"
          />
        </div>

        <span className="text-xs text-ink-secondary font-medium">
          {filteredUsers.length} cliente(s) en este segmento
        </span>
      </div>

      {/* Clients Cards Grid */}
      {filteredUsers.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border p-12 text-center text-ink-secondary text-xs">
          No hay clientes que coincidan con el filtro seleccionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredUsers.map((user) => {
            // Compute user summary
            const firstItem = user.items[0];
            const relevantItems =
              selectedAudience === "IN_WAREHOUSE"
                ? user.items.filter((i) => i.status === "IN_WAREHOUSE")
                : selectedAudience === "IN_TRANSIT"
                ? user.items.filter((i) => i.status === "IN_TRANSIT")
                : user.items;

            const productNames = relevantItems.map((i) => i.snapshotName).join(", ") || firstItem?.snapshotName || "artículos";
            const orderCodes = Array.from(new Set(relevantItems.map((i) => i.orderCode))).join(", ") || firstItem?.orderCode || "";

            const totalBalance = user.items.reduce((sum, item) => {
              if (item.status === "CANCELLED") return sum;
              const b = calculateBalance(
                {
                  quantity: item.quantity,
                  quantityCancelled: item.quantityCancelled,
                  snapshotUnitPrice: item.snapshotUnitPrice,
                },
                item.allocations
              );
              return sum + Math.max(0, b);
            }, 0);

            // Replace variables
            const itemStatusKey = firstItem?.status as OrderItemStatus | undefined;
            const statusLabel =
              (itemStatusKey && ORDER_ITEM_STATUS_LABELS[itemStatusKey]) || "En proceso";

            const personalizedMessage = fillMessageTemplate(customMessage, {
              nombre: user.name.split(" ")[0],
              pedido: orderCodes,
              producto: productNames,
              estado: statusLabel,
              saldo: formatCurrency(totalBalance),
            });

            const isContacted = contactedIds[user.id];

            return (
              <div
                key={user.id}
                className="bg-white rounded-[20px] border border-border p-4 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  {/* Client header */}
                  <div className="flex items-center justify-between gap-2 border-b border-border-light pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-cotton flex items-center justify-center font-bold text-strawberry text-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-ink">{user.name}</h4>
                        <p className="text-[11px] text-ink-secondary">{user.phone}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-ink-secondary block">Saldo pendiente:</span>
                      <strong className="text-xs font-bold text-strawberry font-mono">
                        {formatCurrency(totalBalance)}
                      </strong>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="text-[11px] text-ink-secondary space-y-1 py-2">
                    <p className="line-clamp-2">
                      <strong className="text-ink">Artículos:</strong> {productNames}
                    </p>
                    <p>
                      <strong className="text-ink">Pedido(s):</strong> {orderCodes}
                    </p>
                  </div>

                  {/* Message preview box */}
                  <div className="p-2.5 bg-cotton/40 rounded-xl border border-bubblegum/30 text-xs text-ink whitespace-pre-wrap leading-relaxed">
                    {personalizedMessage}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-2 border-t border-border-light">
                  <div>
                    {isContacted && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Contactado en esta sesión
                      </span>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleContact(user, personalizedMessage)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>Abrir WhatsApp</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent Contact Log Section */}
      <div className="bg-white rounded-[22px] border border-border p-5 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-ink flex items-center gap-2">
          <Clock className="w-4 h-4 text-strawberry" />
          Bitácora de contactos recientes por WhatsApp
        </h3>

        {recentLogs.length === 0 ? (
          <p className="text-xs text-ink-secondary py-3 text-center">
            Aún no se han registrado mensajes enviados en la bitácora.
          </p>
        ) : (
          <div className="divide-y divide-border-light text-xs">
            {recentLogs.slice(0, 8).map((log) => (
              <div key={log.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink">
                    {log.userName} ({log.userPhone})
                  </span>
                  <span className="text-ink-secondary font-mono">
                    {formatDate(log.createdAt)}
                  </span>
                </div>
                <p className="text-ink-secondary text-[11px] bg-meringue/40 p-2 rounded-lg line-clamp-2">
                  {log.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
