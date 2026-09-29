"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Search,
  Filter,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Download,
  MessageCircle,
  Truck,
  Clock,
  History,
  AlertCircle,
  Users,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ItemStatusBadge } from "@/components/orders/item-status-badge";
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge";
import { ItemProgressBar } from "@/components/orders/item-progress-bar";
import {
  updateOrderItemStatusAction,
  recordPartialDeliveryAction,
  batchUpdateItemStatusAction,
} from "@/actions/admin/items";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import {
  calculateAmountDue,
  calculateTotalPaid,
  calculateBalance,
  derivePaymentStatus,
} from "@/lib/domain/payment";
import {
  ORDER_ITEM_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  STATUS_PROGRESS_ORDER,
} from "@/lib/constants";
import type { OrderItemStatus } from "@prisma/client";

export interface SerializedAdminItem {
  id: string;
  orderId: string;
  orderCode: string;
  orderCreatedAt: string;
  orderNote: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  productId: string;
  snapshotName: string;
  snapshotSku: string;
  snapshotUnitPrice: number;
  quantity: number;
  quantityDelivered: number;
  quantityCancelled: number;
  status: OrderItemStatus;
  categoryName: string;
  imageUrl: string | null;
  allocations: {
    id: string;
    amountApplied: number;
    paymentId: string;
  }[];
  logs: {
    id: string;
    fromStatus: OrderItemStatus | null;
    toStatus: OrderItemStatus;
    deliveredDelta: number;
    note: string | null;
    createdAt: string;
    changedByName: string;
  }[];
}

interface ItemsTableProps {
  items: SerializedAdminItem[];
  categories: { id: string; name: string }[];
}

export function ItemsTable({ items: initialItems, categories }: ItemsTableProps) {
  const [items, setItems] = useState<SerializedAdminItem[]>(initialItems);
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [groupByUser, setGroupByUser] = useState(false);

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchStatus, setBatchStatus] = useState<OrderItemStatus>("IN_TRANSIT");
  const [batchNote, setBatchNote] = useState("");
  const [isBatchOpen, setIsBatchOpen] = useState(false);

  // Single Item Modals
  const [statusModalItem, setStatusModalItem] = useState<SerializedAdminItem | null>(null);
  const [newStatus, setNewStatus] = useState<OrderItemStatus>("IN_TRANSIT");
  const [statusNote, setStatusNote] = useState("");

  const [deliveryModalItem, setDeliveryModalItem] = useState<SerializedAdminItem | null>(null);
  const [deliveredDelta, setDeliveredDelta] = useState<number>(1);
  const [deliveryNote, setDeliveryNote] = useState("");

  const [logsModalItem, setLogsModalItem] = useState<SerializedAdminItem | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Computed financial stats per item
  const itemsWithFinancials = useMemo(() => {
    return items.map((item) => {
      const due = calculateAmountDue({
        quantity: item.quantity,
        quantityCancelled: item.quantityCancelled,
        snapshotUnitPrice: item.snapshotUnitPrice,
      });
      const paid = calculateTotalPaid(item.allocations);
      const balance = calculateBalance(
        {
          quantity: item.quantity,
          quantityCancelled: item.quantityCancelled,
          snapshotUnitPrice: item.snapshotUnitPrice,
        },
        item.allocations
      );
      const paymentStatus = derivePaymentStatus(
        {
          quantity: item.quantity,
          quantityCancelled: item.quantityCancelled,
          snapshotUnitPrice: item.snapshotUnitPrice,
        },
        item.allocations
      );

      return {
        ...item,
        due,
        paid,
        balance,
        paymentStatus,
      };
    });
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return itemsWithFinancials.filter((item) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          item.orderCode.toLowerCase().includes(q) ||
          item.userName.toLowerCase().includes(q) ||
          item.userEmail.toLowerCase().includes(q) ||
          item.userPhone.toLowerCase().includes(q) ||
          item.snapshotName.toLowerCase().includes(q) ||
          item.snapshotSku.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Status
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      // Payment Status
      if (paymentFilter !== "ALL" && item.paymentStatus !== paymentFilter) {
        return false;
      }

      // Category
      if (categoryFilter !== "ALL" && item.categoryName !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [itemsWithFinancials, search, statusFilter, paymentFilter, categoryFilter]);

  // Grouped by user (if enabled)
  const groupedByUserList = useMemo(() => {
    if (!groupByUser) return null;
    const map = new Map<string, { user: { id: string; name: string; email: string; phone: string }; items: typeof filteredItems; totalBalance: number }>();
    
    for (const item of filteredItems) {
      if (!map.has(item.userId)) {
        map.set(item.userId, {
          user: {
            id: item.userId,
            name: item.userName,
            email: item.userEmail,
            phone: item.userPhone,
          },
          items: [],
          totalBalance: 0,
        });
      }
      const group = map.get(item.userId)!;
      group.items.push(item);
      if (item.status !== "CANCELLED") {
        group.totalBalance += Math.max(0, item.balance);
      }
    }
    return Array.from(map.values());
  }, [filteredItems, groupByUser]);

  // Select all / toggle
  const allFilteredIds = filteredItems.map((i) => i.id);
  const isAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // CSV Export function (RFC 4180 with UTF-8 BOM)
  const handleExportCSV = () => {
    const headers = [
      "Código Pedido",
      "Fecha",
      "Cliente",
      "Email",
      "Teléfono WhatsApp",
      "SKU",
      "Producto",
      "Categoría",
      "Precio Unitario",
      "Cantidad Pedida",
      "Cantidad Entregada",
      "Cantidad Cancelada",
      "Estado Artículo",
      "Total Debido",
      "Total Pagado",
      "Saldo Pendiente",
      "Estado de Pago",
    ];

    const rows = filteredItems.map((i) => [
      `"${i.orderCode}"`,
      `"${formatDate(i.orderCreatedAt)}"`,
      `"${i.userName.replace(/"/g, '""')}"`,
      `"${i.userEmail}"`,
      `"${i.userPhone}"`,
      `"${i.snapshotSku}"`,
      `"${i.snapshotName.replace(/"/g, '""')}"`,
      `"${i.categoryName}"`,
      i.snapshotUnitPrice.toFixed(2),
      i.quantity,
      i.quantityDelivered,
      i.quantityCancelled,
      `"${ORDER_ITEM_STATUS_LABELS[i.status]}"`,
      i.due.toFixed(2),
      i.paid.toFixed(2),
      i.balance.toFixed(2),
      `"${PAYMENT_STATUS_LABELS[i.paymentStatus]}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `articulos_rainbow_cake_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Actions execution
  const handleUpdateStatus = () => {
    if (!statusModalItem) return;
    startTransition(async () => {
      const res = await updateOrderItemStatusAction(statusModalItem.id, newStatus, statusNote);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === statusModalItem.id
              ? {
                  ...i,
                  status: newStatus,
                  quantityDelivered:
                    newStatus === "DELIVERED"
                      ? i.quantity - i.quantityCancelled
                      : i.quantityDelivered,
                  quantityCancelled:
                    newStatus === "CANCELLED"
                      ? i.quantity - i.quantityDelivered
                      : i.quantityCancelled,
                  logs: [
                    {
                      id: `temp-${Date.now()}`,
                      fromStatus: i.status,
                      toStatus: newStatus,
                      deliveredDelta: 0,
                      note: statusNote || `Cambiado a ${ORDER_ITEM_STATUS_LABELS[newStatus]}`,
                      createdAt: new Date().toISOString(),
                      changedByName: "Admin",
                    },
                    ...i.logs,
                  ],
                }
              : i
          )
        );
        setActionFeedback({ type: "success", text: res.message || "Estado actualizado con éxito." });
        setStatusModalItem(null);
        setStatusNote("");
      } else {
        setActionFeedback({ type: "error", text: res.error || "Error al actualizar estado." });
      }
    });
  };

  const handleRecordDelivery = () => {
    if (!deliveryModalItem) return;
    startTransition(async () => {
      const res = await recordPartialDeliveryAction(deliveryModalItem.id, deliveredDelta, deliveryNote);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) => {
            if (i.id !== deliveryModalItem.id) return i;
            const newDelivered = i.quantityDelivered + deliveredDelta;
            const effectiveTotal = i.quantity - i.quantityCancelled;
            const newStatus =
              newDelivered >= effectiveTotal
                ? ("DELIVERED" as OrderItemStatus)
                : ("PARTIALLY_DELIVERED" as OrderItemStatus);

            return {
              ...i,
              status: newStatus,
              quantityDelivered: newDelivered,
              logs: [
                {
                  id: `temp-${Date.now()}`,
                  fromStatus: i.status,
                  toStatus: newStatus,
                  deliveredDelta: deliveredDelta,
                  note: deliveryNote || `Entrega de ${deliveredDelta} pieza(s)`,
                  createdAt: new Date().toISOString(),
                  changedByName: "Admin",
                },
                ...i.logs,
              ],
            };
          })
        );
        setActionFeedback({ type: "success", text: res.message || "Entrega registrada con éxito." });
        setDeliveryModalItem(null);
        setDeliveryNote("");
      } else {
        setActionFeedback({ type: "error", text: res.error || "Error al registrar entrega." });
      }
    });
  };

  const handleBatchStatus = () => {
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      const res = await batchUpdateItemStatusAction(selectedIds, batchStatus, batchNote);
      if (res.success) {
        setItems((prev) =>
          prev.map((i) => {
            if (!selectedIds.includes(i.id)) return i;
            return {
              ...i,
              status: batchStatus,
              quantityDelivered:
                batchStatus === "DELIVERED"
                  ? i.quantity - i.quantityCancelled
                  : i.quantityDelivered,
              quantityCancelled:
                batchStatus === "CANCELLED"
                  ? i.quantity - i.quantityDelivered
                  : i.quantityCancelled,
              logs: [
                {
                  id: `temp-${Date.now()}`,
                  fromStatus: i.status,
                  toStatus: batchStatus,
                  deliveredDelta: 0,
                  note: batchNote || `Actualización masiva a ${ORDER_ITEM_STATUS_LABELS[batchStatus]}`,
                  createdAt: new Date().toISOString(),
                  changedByName: "Admin",
                },
                ...i.logs,
              ],
            };
          })
        );
        setActionFeedback({ type: "success", text: res.message || "Lote actualizado con éxito." });
        setIsBatchOpen(false);
        setSelectedIds([]);
        setBatchNote("");
      } else {
        setActionFeedback({ type: "error", text: res.error || "Error en actualización de lote." });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Action feedback toast alert */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium animate-in fade-in duration-200 ${
            actionFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{actionFeedback.text}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-ink-secondary hover:text-ink cursor-pointer ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Controls: Search, Filters, View Toggles & Export */}
      <div className="bg-white rounded-[20px] border border-border p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por pedido, cliente, SKU, producto..."
              className="pl-9 h-10 text-xs sm:text-sm bg-meringue/30 border-pink-200/80"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-secondary hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action buttons: Grouping and CSV Export */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={groupByUser ? "default" : "outline"}
              size="sm"
              onClick={() => setGroupByUser(!groupByUser)}
              className="text-xs h-10 gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{groupByUser ? "Desagrupar" : "Agrupar por cliente"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="text-xs h-10 gap-1.5 border-pink-200/80 text-ink hover:text-strawberry"
            >
              <Download className="w-3.5 h-3.5 text-strawberry" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* Filter Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-border-light">
          {/* Item Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-secondary">Estado del artículo</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado del artículo"
              className="w-full h-8 px-2.5 rounded-lg border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="ALL">Todos los estados ({items.length})</option>
              {Object.entries(ORDER_ITEM_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Status */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-secondary">Estado de pago</label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              aria-label="Filtrar por estado de pago"
              className="w-full h-8 px-2.5 rounded-lg border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="ALL">Todos los estados de pago</option>
              {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-ink-secondary">Categoría</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filtrar por categoría"
              className="w-full h-8 px-2.5 rounded-lg border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
            >
              <option value="ALL">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Sticky Batch Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 bg-cotton/90 border border-strawberry/40 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="bg-strawberry text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-ink">
              artículo(s) seleccionado(s) para acción en lote
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedIds([])}
              className="text-xs h-8"
            >
              Deseleccionar
            </Button>
            <Button
              size="sm"
              onClick={() => setIsBatchOpen(true)}
              className="text-xs h-8 bg-strawberry hover:bg-strawberry-dark text-white gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Cambiar estado en lote
            </Button>
          </div>
        </div>
      )}

      {/* Select All Row */}
      <div className="flex items-center justify-between px-2 text-xs text-ink-secondary">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 hover:text-ink cursor-pointer font-medium"
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 text-strawberry" />
          ) : (
            <Square className="w-4 h-4 text-ink-secondary" />
          )}
          <span>Seleccionar todo lo filtrado ({filteredItems.length})</span>
        </button>

        <span>Mostrando {filteredItems.length} de {items.length} artículos</span>
      </div>

      {/* List / Table Content */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border p-12 text-center text-ink-secondary">
          <Package className="w-10 h-10 text-bubblegum mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-ink">No se encontraron artículos</p>
          <p className="text-xs mt-1">Prueba cambiando o limpiando los filtros de búsqueda.</p>
        </div>
      ) : groupByUser && groupedByUserList ? (
        /* Grouped By User View */
        <div className="space-y-4">
          {groupedByUserList.map((group) => {
            const waLink = buildWhatsAppLink(
              group.user.phone,
              `¡Hola ${group.user.name.split(" ")[0]}! Nos comunicamos de Rainbow Cake GO sobre tus artículos pendientes.`
            );

            return (
              <div
                key={group.user.id}
                className="bg-white rounded-[22px] border border-border shadow-xs overflow-hidden"
              >
                {/* User Header */}
                <div className="bg-meringue/60 border-b border-border-light px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-cotton flex items-center justify-center font-bold text-strawberry text-xs border border-bubblegum/40">
                      {group.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-ink leading-tight">
                        {group.user.name}
                      </h3>
                      <p className="text-[11px] text-ink-secondary">
                        {group.user.email} • {group.user.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[11px] text-ink-secondary">Saldo pendiente</p>
                      <p className="text-xs font-bold text-strawberry">
                        {formatCurrency(group.totalBalance)}
                      </p>
                    </div>

                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>

                {/* User Items */}
                <div className="divide-y divide-border-light p-2">
                  {group.items.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.includes(item.id)}
                      onToggleSelect={() => toggleSelectItem(item.id)}
                      onOpenStatusModal={() => {
                        setStatusModalItem(item);
                        setNewStatus(item.status);
                      }}
                      onOpenDeliveryModal={() => {
                        setDeliveryModalItem(item);
                        setDeliveredDelta(1);
                      }}
                      onOpenLogsModal={() => setLogsModalItem(item)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Flat Items List View */
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[18px] border border-border p-3.5 shadow-xs hover:border-pink-300 transition-colors"
            >
              <ItemRow
                item={item}
                isSelected={selectedIds.includes(item.id)}
                onToggleSelect={() => toggleSelectItem(item.id)}
                onOpenStatusModal={() => {
                  setStatusModalItem(item);
                  setNewStatus(item.status);
                }}
                onOpenDeliveryModal={() => {
                  setDeliveryModalItem(item);
                  setDeliveredDelta(1);
                }}
                onOpenLogsModal={() => setLogsModalItem(item)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Change Status Modal */}
      <Dialog open={!!statusModalItem} onOpenChange={(open) => !open && setStatusModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-strawberry" />
              Cambiar estado del artículo
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              Artículo: <strong>{statusModalItem?.snapshotName}</strong> ({statusModalItem?.snapshotSku})
              en pedido <strong>{statusModalItem?.orderCode}</strong> de {statusModalItem?.userName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Nuevo estado</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderItemStatus)}
                aria-label="Seleccionar nuevo estado"
                className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-sm text-ink outline-hidden focus:border-strawberry focus:ring-2 focus:ring-strawberry/20"
              >
                {Object.entries(ORDER_ITEM_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Nota opcional (se incluirá en el correo y bitácora)
              </label>
              <Input
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Ej. Llegó lote de producción, listo en punto centro"
                className="text-xs"
              />
            </div>

            <div className="p-3 bg-cotton/40 rounded-xl border border-bubblegum/30 text-[11px] text-ink-secondary space-y-1">
              <p className="font-semibold text-ink">Notificación automática:</p>
              <p>
                Al guardar, se enviará un correo a <strong>{statusModalItem?.userEmail}</strong> informándole que su artículo ahora se encuentra en estado <strong>{ORDER_ITEM_STATUS_LABELS[newStatus]}</strong>.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setStatusModalItem(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={isPending}
              className="bg-strawberry hover:bg-strawberry-dark text-white"
            >
              {isPending ? "Guardando..." : "Actualizar estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Partial Delivery Modal */}
      <Dialog open={!!deliveryModalItem} onOpenChange={(open) => !open && setDeliveryModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-emerald-600" />
              Registrar entrega en persona
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              Artículo: <strong>{deliveryModalItem?.snapshotName}</strong> (
              {deliveryModalItem?.quantityDelivered} de {deliveryModalItem?.quantity} ya entregadas)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Piezas entregadas en este momento
              </label>
              <Input
                type="number"
                min={1}
                max={
                  deliveryModalItem
                    ? deliveryModalItem.quantity -
                      deliveryModalItem.quantityCancelled -
                      deliveryModalItem.quantityDelivered
                    : 1
                }
                value={deliveredDelta}
                onChange={(e) => setDeliveredDelta(parseInt(e.target.value, 10) || 1)}
                className="text-sm"
              />
              <p className="text-[11px] text-ink-secondary">
                Pendientes por entregar:{" "}
                <strong>
                  {deliveryModalItem
                    ? deliveryModalItem.quantity -
                      deliveryModalItem.quantityCancelled -
                      deliveryModalItem.quantityDelivered
                    : 0}{" "}
                  pieza(s)
                </strong>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Nota de entrega (opcional)
              </label>
              <Input
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Ej. Entregado en Metro Insurgentes a Valeria"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeliveryModalItem(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRecordDelivery}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? "Registrando..." : "Confirmar entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Status Modal */}
      <Dialog open={isBatchOpen} onOpenChange={setIsBatchOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-strawberry" />
              Actualizar {selectedIds.length} artículo(s) en lote
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              Todos los artículos seleccionados cambiarán al estado indicado. Los clientes recibirán un correo consolidado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">Nuevo estado para los artículos</label>
              <select
                value={batchStatus}
                onChange={(e) => setBatchStatus(e.target.value as OrderItemStatus)}
                aria-label="Seleccionar estado para el lote"
                className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-sm text-ink outline-hidden focus:border-strawberry focus:ring-2 focus:ring-strawberry/20"
              >
                {Object.entries(ORDER_ITEM_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink">
                Nota general del lote (opcional)
              </label>
              <Input
                value={batchNote}
                onChange={(e) => setBatchNote(e.target.value)}
                placeholder="Ej. Arribó contenedor, listos para coordinar entrega"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsBatchOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBatchStatus}
              disabled={isPending}
              className="bg-strawberry hover:bg-strawberry-dark text-white"
            >
              {isPending ? "Actualizando..." : "Aplicar a lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History / Logs Modal */}
      <Dialog open={!!logsModalItem} onOpenChange={(open) => !open && setLogsModalItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-strawberry" />
              Bitácora de movimientos
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              {logsModalItem?.snapshotName} ({logsModalItem?.snapshotSku}) • Pedido {logsModalItem?.orderCode}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto space-y-3 py-2 pr-1">
            {logsModalItem?.logs && logsModalItem.logs.length > 0 ? (
              <div className="relative pl-4 border-l-2 border-bubblegum/40 space-y-3">
                {logsModalItem.logs.map((log) => (
                  <div key={log.id} className="relative text-xs">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-strawberry border-2 border-white" />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-ink">
                        {ORDER_ITEM_STATUS_LABELS[log.toStatus] || log.toStatus}
                      </span>
                      <span className="text-[11px] text-ink-secondary font-mono">
                        {formatDate(log.createdAt)}
                      </span>
                    </div>
                    {log.fromStatus && (
                      <p className="text-[11px] text-ink-secondary">
                        Estado anterior: {ORDER_ITEM_STATUS_LABELS[log.fromStatus] || log.fromStatus}
                      </p>
                    )}
                    {log.deliveredDelta > 0 && (
                      <p className="text-[11px] text-emerald-700 font-medium">
                        +{log.deliveredDelta} pieza(s) entregada(s)
                      </p>
                    )}
                    {log.note && (
                      <p className="text-ink-secondary mt-1 bg-cotton/40 p-2 rounded-lg border border-bubblegum/20">
                        {log.note}
                      </p>
                    )}
                    <p className="text-[10px] text-ink-secondary/70 mt-0.5">
                      Registrado por: {log.changedByName}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-secondary text-center py-4">
                No hay movimientos registrados para este artículo.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLogsModalItem(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Subcomponent for each item row
interface ItemRowProps {
  item: SerializedAdminItem & {
    due: number;
    paid: number;
    balance: number;
    paymentStatus: any;
  };
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpenStatusModal: () => void;
  onOpenDeliveryModal: () => void;
  onOpenLogsModal: () => void;
}

function ItemRow({
  item,
  isSelected,
  onToggleSelect,
  onOpenStatusModal,
  onOpenDeliveryModal,
  onOpenLogsModal,
}: ItemRowProps) {
  const waLink = buildWhatsAppLink(
    item.userPhone,
    `¡Hola ${item.userName.split(" ")[0]}! Nos comunicamos de Rainbow Cake GO sobre tu artículo ${item.snapshotName} del pedido ${item.orderCode}.`
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between py-2 text-xs">
      {/* Left: Checkbox + Thumbnail + Order & Product info */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onToggleSelect}
          className="mt-1 sm:mt-0 text-ink-secondary hover:text-ink cursor-pointer shrink-0"
        >
          {isSelected ? (
            <CheckSquare className="w-4 h-4 text-strawberry" />
          ) : (
            <Square className="w-4 h-4 text-ink-secondary/50" />
          )}
        </button>

        <div className="w-12 h-12 rounded-xl bg-cotton/50 border border-border-light overflow-hidden shrink-0 flex items-center justify-center relative">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.snapshotName}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : (
            <Package className="w-5 h-5 text-bubblegum" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] font-bold text-strawberry bg-cotton px-1.5 py-0.2 rounded border border-bubblegum/40">
              {item.orderCode}
            </span>
            <span className="text-[11px] text-ink-secondary font-medium">
              {item.userName}
            </span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {item.categoryName}
            </Badge>
          </div>

          <h4 className="font-semibold text-xs text-ink truncate">
            {item.snapshotName}
          </h4>

          <div className="flex items-center gap-3 text-[11px] text-ink-secondary">
            <span className="font-mono">SKU: {item.snapshotSku}</span>
            <span>
              Pedidas: <strong className="text-ink">{item.quantity}</strong>
            </span>
            {item.quantityDelivered > 0 && (
              <span className="text-emerald-700 font-medium">
                Entregadas: {item.quantityDelivered}
              </span>
            )}
            {item.quantityCancelled > 0 && (
              <span className="text-rose-600 font-medium">
                Canceladas: {item.quantityCancelled}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Middle: Badges + Balances */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-7 sm:pl-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <ItemStatusBadge status={item.status} className="text-[11px] px-2 py-0.5" />
          <PaymentStatusBadge status={item.paymentStatus} className="text-[11px] px-2 py-0.5" />
        </div>

        <div className="text-[11px] text-ink-secondary flex items-center gap-2">
          <span>
            Total: <strong className="text-ink">{formatCurrency(item.due)}</strong>
          </span>
          <span>•</span>
          {item.balance > 0 ? (
            <span>
              Saldo: <strong className="text-strawberry">{formatCurrency(item.balance)}</strong>
            </span>
          ) : (
            <span className="text-emerald-700 font-semibold">Liquidado</span>
          )}
        </div>
      </div>

      {/* Right: Actions Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 pl-7 sm:pl-0 pt-1 sm:pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenStatusModal}
          className="text-xs h-7 px-2 border-pink-200/80 hover:bg-cotton/40"
          title="Cambiar estado"
        >
          <RefreshCw className="w-3 h-3 text-strawberry mr-1" />
          Estado
        </Button>

        {item.status !== "DELIVERED" && item.status !== "CANCELLED" && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenDeliveryModal}
            className="text-xs h-7 px-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700"
            title="Registrar entrega"
          >
            <Truck className="w-3 h-3 mr-1" />
            Entrega
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenLogsModal}
          className="text-xs h-7 w-7 p-0 text-ink-secondary hover:text-ink"
          title="Ver bitácora"
        >
          <History className="w-3.5 h-3.5" />
        </Button>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="h-7 w-7 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"
          title="Contactar por WhatsApp"
        >
          <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
        </a>
      </div>
    </div>
  );
}
