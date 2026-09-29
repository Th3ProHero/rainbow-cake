"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  Package, 
  MessageCircle, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  ShoppingBag,
  Info,
  Calendar,
  CreditCard
} from "lucide-react";
import { ItemProgressBar } from "@/components/orders/item-progress-bar";
import { ItemStatusBadge } from "@/components/orders/item-status-badge";
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cancelOrderItemAction } from "@/actions/orders";
import { uploadUserPaymentAction } from "@/actions/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { derivePaymentStatus, calculateAmountDue, calculateTotalPaid, calculateBalance } from "@/lib/domain/payment";
import { deriveOrderStatus } from "@/lib/domain/order";
import { ORDER_ITEM_STATUS_LABELS } from "@/lib/constants";
import type { OrderItemStatus } from "@prisma/client";

export interface SerializedLog {
  id: string;
  fromStatus: OrderItemStatus | null;
  toStatus: OrderItemStatus;
  deliveredDelta: number;
  note: string | null;
  createdAt: string;
  changedByName: string;
  changedByRole: string;
}

export interface SerializedAllocation {
  id: string;
  amountApplied: number;
  paymentId: string;
}

export interface SerializedOrderItem {
  id: string;
  productId: string;
  snapshotName: string;
  snapshotSku: string;
  snapshotUnitPrice: number;
  quantity: number;
  quantityDelivered: number;
  quantityCancelled: number;
  status: OrderItemStatus;
  imageUrl?: string | null;
  allocations: SerializedAllocation[];
  logs: SerializedLog[];
}

export interface SerializedOrder {
  id: string;
  code: string;
  createdAt: string;
  note: string | null;
  items: SerializedOrderItem[];
}

interface OrdersListProps {
  orders: SerializedOrder[];
  whatsappPhone: string;
  userFirstName: string;
}

export function OrdersList({ orders: initialOrders, whatsappPhone, userFirstName }: OrdersListProps) {
  const [orders, setOrders] = useState<SerializedOrder[]>(initialOrders);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "COMPLETED" | "CANCELLED">("ALL");
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  
  // Cancellation dialog state
  const [itemToCancel, setItemToCancel] = useState<{
    orderId: string;
    orderCode: string;
    itemId: string;
    name: string;
    quantity: number;
  } | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Payment upload state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadAmount, setUploadAmount] = useState("");
  const [uploadMethod, setUploadMethod] = useState("Transferencia");
  const [uploadReference, setUploadReference] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleUploadPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadFeedback({ type: "error", text: "Selecciona tu comprobante (JPG, PNG o PDF)." });
      return;
    }

    setIsUploading(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      formData.append("receipt", uploadFile);
      if (uploadAmount) formData.append("amount", uploadAmount);
      formData.append("method", uploadMethod);
      if (uploadReference) formData.append("reference", uploadReference);
      if (uploadNote) formData.append("note", uploadNote);

      const res = await uploadUserPaymentAction(formData);
      if (!res.success) {
        setUploadFeedback({ type: "error", text: res.error || "No se pudo subir el comprobante." });
        setIsUploading(false);
        return;
      }

      setUploadFeedback({
        type: "success",
        text: "¡Comprobante subido con éxito! Lo revisaremos y acreditaremos a tus artículos.",
      });
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadAmount("");
      setUploadReference("");
      setUploadNote("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado al subir comprobante.";
      setUploadFeedback({ type: "error", text: msg });
    } finally {
      setIsUploading(false);
    }
  };

  const toggleLogs = (itemId: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleConfirmCancel = async () => {
    if (!itemToCancel) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const res = await cancelOrderItemAction(itemToCancel.itemId);
      if (!res.success) {
        setCancelError(res.error || "No fue posible cancelar el artículo.");
        setIsCancelling(false);
        return;
      }

      // Update local state
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== itemToCancel.orderId) return order;
          return {
            ...order,
            items: order.items.map((item) => {
              if (item.id !== itemToCancel.itemId) return item;
              return {
                ...item,
                status: "CANCELLED" as OrderItemStatus,
                quantityCancelled: item.quantity,
                logs: [
                  {
                    id: `local-${Date.now()}`,
                    fromStatus: item.status,
                    toStatus: "CANCELLED" as OrderItemStatus,
                    deliveredDelta: 0,
                    note: "Cancelado por el cliente",
                    createdAt: new Date().toISOString(),
                    changedByName: userFirstName,
                    changedByRole: "USER",
                  },
                  ...item.logs,
                ],
              };
            }),
          };
        })
      );

      setItemToCancel(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado al cancelar.";
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((order) => {
    const derivedStatus = deriveOrderStatus(order.items);
    if (filter === "ALL") return true;
    return derivedStatus === filter;
  });

  // Calculate summary metrics
  const totalOrders = orders.length;
  const activeItemsCount = orders.reduce((sum, order) => {
    return (
      sum +
      order.items.filter(
        (i) => i.status !== "CANCELLED" && i.status !== "DELIVERED"
      ).length
    );
  }, 0);

  const totalPendingBalance = orders.reduce((sum, order) => {
    return (
      sum +
      order.items.reduce((itemSum, item) => {
        if (item.status === "CANCELLED") return itemSum;
        const balance = calculateBalance(
          {
            quantity: item.quantity,
            quantityCancelled: item.quantityCancelled,
            snapshotUnitPrice: item.snapshotUnitPrice,
          },
          item.allocations
        );
        return itemSum + Math.max(0, balance);
      }, 0)
    );
  }, 0);

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-[24px] border border-border p-8 text-center shadow-card max-w-lg mx-auto my-8">
        <div className="w-16 h-16 rounded-full bg-cotton flex items-center justify-center mx-auto mb-4 text-strawberry">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-display font-semibold text-ink mb-2">
          Aún no tienes pedidos
        </h2>
        <p className="text-sm text-ink-secondary mb-6 leading-relaxed">
          Explora nuestro catálogo de mercancía oficial de Rainbow Cake y añade tus artículos favoritos.
        </p>
        <Link href="/catalog">
          <Button variant="default" size="lg" className="w-full">
            Ver catálogo de productos
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload feedback banner */}
      {uploadFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
            uploadFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span>{uploadFeedback.text}</span>
          <button
            onClick={() => setUploadFeedback(null)}
            className="text-ink-secondary hover:text-ink cursor-pointer ml-3 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Upload Receipt Action Card */}
      <div className="bg-cotton/60 border border-bubblegum/40 rounded-[20px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-strawberry" />
            ¿Realizaste una transferencia o abono?
          </h3>
          <p className="text-xs text-ink-secondary mt-0.5">
            Sube tu comprobante de pago para que lo acreditemos a tus artículos activos.
          </p>
        </div>
        <Button
          onClick={() => setIsUploadOpen(true)}
          className="text-xs h-9 bg-strawberry hover:bg-strawberry-dark text-white shrink-0"
        >
          Subir comprobante de pago
        </Button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-[16px] border border-border p-3 text-center shadow-xs">
          <p className="text-xs text-ink-secondary font-medium">Pedidos</p>
          <p className="text-lg sm:text-xl font-display font-bold text-ink">{totalOrders}</p>
        </div>
        <div className="bg-white rounded-[16px] border border-border p-3 text-center shadow-xs">
          <p className="text-xs text-ink-secondary font-medium">Artículos activos</p>
          <p className="text-lg sm:text-xl font-display font-bold text-strawberry">{activeItemsCount}</p>
        </div>
        <div className="bg-white rounded-[16px] border border-border p-3 text-center shadow-xs">
          <p className="text-xs text-ink-secondary font-medium">Saldo por liquidar</p>
          <p className="text-lg sm:text-xl font-display font-bold text-ink">{formatCurrency(totalPendingBalance)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === "ALL"
              ? "bg-strawberry text-white shadow-xs"
              : "bg-white text-ink-secondary border border-border hover:bg-cotton/40"
          }`}
        >
          Todos ({orders.length})
        </button>
        <button
          onClick={() => setFilter("OPEN")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === "OPEN"
              ? "bg-strawberry text-white shadow-xs"
              : "bg-white text-ink-secondary border border-border hover:bg-cotton/40"
          }`}
        >
          En curso / Abiertos
        </button>
        <button
          onClick={() => setFilter("COMPLETED")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === "COMPLETED"
              ? "bg-strawberry text-white shadow-xs"
              : "bg-white text-ink-secondary border border-border hover:bg-cotton/40"
          }`}
        >
          Completados
        </button>
        <button
          onClick={() => setFilter("CANCELLED")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            filter === "CANCELLED"
              ? "bg-strawberry text-white shadow-xs"
              : "bg-white text-ink-secondary border border-border hover:bg-cotton/40"
          }`}
        >
          Cancelados
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border p-8 text-center text-ink-secondary text-sm">
          No hay pedidos con el filtro seleccionado.
        </div>
      ) : (
        <div className="space-y-5">
          {filteredOrders.map((order) => {
            const derivedStatus = deriveOrderStatus(order.items);
            const orderTotal = order.items.reduce((sum, item) => {
              if (item.status === "CANCELLED") return sum;
              return sum + item.snapshotUnitPrice * (item.quantity - item.quantityCancelled);
            }, 0);

            // Generate WhatsApp inquiry text
            const itemsSummary = order.items
              .map((i) => `${i.snapshotName} (${i.quantity} pza${i.quantity > 1 ? "s" : ""})`)
              .join(", ");
            const waMsg = `¡Hola! Soy ${userFirstName}. Quisiera consultar información sobre mi pedido ${order.code} (${itemsSummary}).`;
            const waUrl = buildWhatsAppLink(whatsappPhone, waMsg);

            return (
              <div
                key={order.id}
                className="bg-white rounded-[22px] border border-border shadow-card overflow-hidden transition-all duration-200"
              >
                {/* Order Header */}
                <div className="bg-meringue/60 border-b border-border-light px-4 py-3.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-strawberry bg-cotton px-2.5 py-1 rounded-md border border-bubblegum/40">
                      {order.code}
                    </span>
                    <span className="text-xs text-ink-secondary flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(order.createdAt)}
                    </span>
                  </div>

                  <div>
                    {derivedStatus === "OPEN" && (
                      <Badge variant="inWarehouse" className="text-xs font-medium">
                        Pedido en curso
                      </Badge>
                    )}
                    {derivedStatus === "COMPLETED" && (
                      <Badge variant="delivered" className="text-xs font-medium">
                        Completado
                      </Badge>
                    )}
                    {derivedStatus === "CANCELLED" && (
                      <Badge variant="cancelled" className="text-xs font-medium">
                        Cancelado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Order Note (if any) */}
                {order.note && (
                  <div className="mx-4 mt-3 p-2.5 rounded-[12px] bg-cotton/50 border border-bubblegum/30 text-xs text-ink-secondary flex items-start gap-2">
                    <Info className="w-4 h-4 text-strawberry shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-ink font-semibold">Nota:</strong> {order.note}
                    </span>
                  </div>
                )}

                {/* Order Items */}
                <div className="p-4 divide-y divide-border-light">
                  {order.items.map((item) => {
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

                    const canCancel = item.status === "PENDING";
                    const isExpanded = !!expandedLogs[item.id];

                    return (
                      <div key={item.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                        {/* Item top line: Image, Name, SKU, Price */}
                        <div className="flex gap-3 items-start">
                          <div className="w-14 h-14 rounded-xl bg-cotton/40 border border-border-light overflow-hidden shrink-0 flex items-center justify-center relative">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.snapshotName}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-bubblegum" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <h4 className="font-semibold text-sm text-ink line-clamp-1">
                                  {item.snapshotName}
                                </h4>
                                <p className="text-xs text-ink-secondary font-mono">
                                  SKU: {item.snapshotSku}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-bold text-ink">
                                  {formatCurrency(item.snapshotUnitPrice * item.quantity)}
                                </p>
                                <p className="text-[11px] text-ink-secondary">
                                  {item.quantity} × {formatCurrency(item.snapshotUnitPrice)}
                                </p>
                              </div>
                            </div>

                            {/* Quantities breakdown if partial or cancelled */}
                            {(item.quantityDelivered > 0 || item.quantityCancelled > 0) && (
                              <div className="flex gap-2 text-[11px] text-ink-secondary mt-1">
                                {item.quantityDelivered > 0 && (
                                  <span className="text-emerald-700 font-medium">
                                    Entregados: {item.quantityDelivered}/{item.quantity}
                                  </span>
                                )}
                                {item.quantityCancelled > 0 && (
                                  <span className="text-rose-600 font-medium">
                                    Cancelados: {item.quantityCancelled}/{item.quantity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Signature Segmented Progress Bar */}
                        <div className="bg-meringue/40 rounded-xl p-2.5 border border-border-light/80">
                          <ItemProgressBar status={item.status} />
                        </div>

                        {/* Badges and Financial Breakdown */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <ItemStatusBadge status={item.status} />
                            <PaymentStatusBadge status={paymentStatus} />
                          </div>

                          {/* Balances */}
                          <div className="flex items-center gap-3 text-ink-secondary font-medium">
                            <span>
                              Abonado: <strong className="text-ink">{formatCurrency(paid)}</strong>
                            </span>
                            {balance > 0 ? (
                              <span>
                                Saldo: <strong className="text-strawberry">{formatCurrency(balance)}</strong>
                              </span>
                            ) : balance < 0 ? (
                              <span className="text-emerald-700 font-semibold">
                                Saldo a favor: {formatCurrency(Math.abs(balance))}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">Liquidado</span>
                            )}
                          </div>
                        </div>

                        {/* Actions line: Cancel button or contact info + Timeline toggle */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div>
                            {canCancel ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setItemToCancel({
                                    orderId: order.id,
                                    orderCode: order.code,
                                    itemId: item.id,
                                    name: item.snapshotName,
                                    quantity: item.quantity,
                                  })
                                }
                                className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 text-xs h-7 px-2.5"
                              >
                                Cancelar artículo
                              </Button>
                            ) : item.status === "CANCELLED" ? (
                              <span className="text-xs text-ink-secondary italic">
                                Artículo cancelado
                              </span>
                            ) : (
                              <span className="text-[11px] text-ink-secondary flex items-center gap-1">
                                <Info className="w-3 h-3 text-bubblegum" />
                                Para cambios en tránsito/almacén, contáctanos por WhatsApp.
                              </span>
                            )}
                          </div>

                          {/* Timeline expand toggle */}
                          {item.logs && item.logs.length > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleLogs(item.id)}
                              className="text-xs text-strawberry hover:text-strawberry-dark font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isExpanded ? "Ocultar historial" : "Historial"}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Collapsible Timeline */}
                        {isExpanded && item.logs && item.logs.length > 0 && (
                          <div className="bg-cotton/30 rounded-xl p-3 border border-bubblegum/20 text-xs space-y-2 mt-2">
                            <p className="font-semibold text-ink text-[11px] uppercase tracking-wider">
                              Seguimiento del artículo
                            </p>
                            <div className="relative pl-3 border-l-2 border-bubblegum/50 space-y-2.5">
                              {item.logs.map((log) => (
                                <div key={log.id} className="relative">
                                  <div className="absolute -left-[17px] top-1 w-2 h-2 rounded-full bg-strawberry" />
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-medium text-ink">
                                      {ORDER_ITEM_STATUS_LABELS[log.toStatus] || log.toStatus}
                                    </span>
                                    <span className="text-ink-secondary font-mono">
                                      {formatDate(log.createdAt)}
                                    </span>
                                  </div>
                                  {log.note && (
                                    <p className="text-[11px] text-ink-secondary mt-0.5">
                                      {log.note}
                                    </p>
                                  )}
                                  {log.deliveredDelta > 0 && (
                                    <p className="text-[11px] text-emerald-700 font-medium">
                                      +{log.deliveredDelta} pieza(s) entregada(s)
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Order Footer with total & WhatsApp contact */}
                <div className="bg-meringue/40 border-t border-border-light px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-ink-secondary font-medium">Total pedido:</span>{" "}
                    <span className="text-base font-bold text-ink">{formatCurrency(orderTotal)}</span>
                  </div>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={!!itemToCancel} onOpenChange={(open) => !open && setItemToCancel(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Cancelar artículo
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-secondary pt-2">
              ¿Estás seguro de que deseas cancelar el artículo{" "}
              <strong className="text-ink">{itemToCancel?.name}</strong> (
              {itemToCancel?.quantity} pza(s)) del pedido{" "}
              <strong className="text-ink">{itemToCancel?.orderCode}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-cotton/40 rounded-xl p-3 text-xs text-ink-secondary border border-bubblegum/30 space-y-1">
            <p className="font-semibold text-ink">Información importante:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Esta acción no se puede deshacer.</li>
              <li>Si ya habías registrado abonos para este artículo, se calcularán como saldo a favor para tus siguientes pedidos.</li>
            </ul>
          </div>

          {cancelError && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {cancelError}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setItemToCancel(null)}
              disabled={isCancelling}
            >
              No, volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelando..." : "Sí, cancelar artículo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Payment Receipt Modal */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUploadPayment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-strawberry">
                <CreditCard className="w-5 h-5 text-strawberry" />
                Subir comprobante de pago
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Adjunta tu captura o comprobante bancario. Lo verificaremos y actualizaremos tu saldo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-ink">
                  Archivo de comprobante (JPG, PNG o PDF) *
                </label>
                <Input
                  type="file"
                  required
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Monto pagado ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={uploadAmount}
                    onChange={(e) => setUploadAmount(e.target.value)}
                    placeholder="Ej. 350.00"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Método</label>
                  <select
                    value={uploadMethod}
                    onChange={(e) => setUploadMethod(e.target.value)}
                    aria-label="Seleccionar método"
                    className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden"
                  >
                    <option value="Transferencia">Transferencia SPEI</option>
                    <option value="Depósito en efectivo">Depósito OXXO / Banco</option>
                    <option value="Efectivo en persona">Efectivo en persona</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Folio / Referencia (opcional)</label>
                <Input
                  value={uploadReference}
                  onChange={(e) => setUploadReference(e.target.value)}
                  placeholder="Ej. Rastreo SPEI o número de ticket"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Nota (opcional)</label>
                <Input
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  placeholder="Ej. Pago de llavero y apartado de peluche"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsUploadOpen(false)}
                disabled={isUploading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isUploading}
                className="bg-strawberry hover:bg-strawberry-dark text-white"
              >
                {isUploading ? "Subiendo..." : "Enviar comprobante"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
