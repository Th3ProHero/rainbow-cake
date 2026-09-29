"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import {
  Users,
  Search,
  MessageCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Shield,
  ShoppingBag,
  ExternalLink,
  CreditCard,
  CheckSquare,
  Square,
  ArrowRight,
  Package,
  Calendar,
  AlertCircle,
  Eye,
  RotateCcw,
  Camera,
  Upload,
  Undo2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  updateUserNotesAction,
  toggleUserStatusAction,
} from "@/actions/admin/users";
import {
  markItemsAsPaidAction,
  unmarkItemsPaymentAction,
  requestReturnAction,
  completeReturnAction,
  cancelReturnAction,
} from "@/actions/admin/payments";
import { ItemStatusBadge } from "@/components/orders/item-status-badge";
import { PaymentStatusBadge } from "@/components/orders/payment-status-badge";
import { ItemProgressBar } from "@/components/orders/item-progress-bar";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { OrderItemStatus } from "@prisma/client";

export interface ItemAllocationDetail {
  id: string;
  amountApplied: number;
  paymentId: string;
  paymentMethod: string | null;
  paymentPaidAt: string;
  paymentReference: string | null;
  paymentFilePath: string | null;
  paymentMimeType: string | null;
  paymentOriginalName: string | null;
}

export interface UserOrderItemDetail {
  id: string;
  orderId: string;
  orderCode: string;
  orderCreatedAt: string;
  snapshotName: string;
  snapshotSku: string;
  snapshotUnitPrice: number;
  quantity: number;
  quantityDelivered: number;
  quantityCancelled: number;
  status: OrderItemStatus;
  productImageUrl: string | null;
  due: number;
  paid: number;
  balance: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID" | "CREDIT";
  allocations: ItemAllocationDetail[];
}

export interface SerializedReturnItem {
  id: string;
  orderItemId: string;
  refundAmount: number;
  snapshotName: string;
  snapshotSku: string;
}

export interface SerializedReturn {
  id: string;
  status: "REQUESTED" | "COMPLETED";
  reason: string | null;
  receiptFilePath: string | null;
  receiptMimeType: string | null;
  receiptOriginalName: string | null;
  completedAt: string | null;
  createdAt: string;
  items: SerializedReturnItem[];
}

export interface SerializedAdminUser {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  role: "ADMIN" | "USER";
  isActive: boolean;
  internalNotes: string | null;
  createdAt: string;
  ordersCount: number;
  activeItemsCount: number;
  totalBalanceDue: number;
  items: UserOrderItemDetail[];
  returns: SerializedReturn[];
}

interface UsersTableProps {
  users: SerializedAdminUser[];
}

export function UsersTable({ users: initialUsers }: UsersTableProps) {
  const [users, setUsers] = useState<SerializedAdminUser[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Selected user for details drawer
  const [selectedUser, setSelectedUser] = useState<SerializedAdminUser | null>(null);

  // Selected item IDs inside the user details modal
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemFilter, setItemFilter] = useState<"ALL" | "UNPAID" | "PAID">("ALL");

  // Payment marking modal state
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("Transferencia");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);

  // Receipt Preview Modal
  const [previewReceiptUrl, setPreviewReceiptUrl] = useState<{
    url: string;
    isPdf: boolean;
    name: string;
  } | null>(null);

  // Internal Notes Modal
  const [notesUser, setNotesUser] = useState<SerializedAdminUser | null>(null);
  const [notesContent, setNotesContent] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Return modal state
  const [isReturnRequestOpen, setIsReturnRequestOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isCompleteReturnOpen, setIsCompleteReturnOpen] = useState(false);
  const [completingReturn, setCompletingReturn] = useState<SerializedReturn | null>(null);
  const [returnReceiptFile, setReturnReceiptFile] = useState<File | null>(null);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.whatsapp.toLowerCase().includes(q)
    );
  }, [users, search]);

  // Keep selectedUser in sync with state updates
  const activeUser = useMemo(() => {
    if (!selectedUser) return null;
    return users.find((u) => u.id === selectedUser.id) || selectedUser;
  }, [users, selectedUser]);

  // Filter items inside user modal
  const modalItems = useMemo(() => {
    if (!activeUser) return [];
    return activeUser.items.filter((item) => {
      if (itemFilter === "UNPAID") return item.paymentStatus !== "PAID";
      if (itemFilter === "PAID") return item.paymentStatus === "PAID";
      return true;
    });
  }, [activeUser, itemFilter]);

  const allModalItemIds = modalItems.map((i) => i.id);
  const isAllItemsSelected =
    allModalItemIds.length > 0 &&
    allModalItemIds.every((id) => selectedItemIds.includes(id));

  const toggleSelectAllItems = () => {
    if (isAllItemsSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(allModalItemIds);
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open modal for marking specific items or single item
  const handleOpenMarkPaidForItems = (itemIds: string[]) => {
    setSelectedItemIds(itemIds);
    setPaymentMethod("Transferencia");
    setPaymentReference("");
    setPaymentNote("");
    setPaymentReceiptFile(null);
    setIsMarkPaidOpen(true);
  };

  // Submit Mark as Paid
  const handleConfirmMarkAsPaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || selectedItemIds.length === 0) return;

    const formData = new FormData();
    formData.append("userId", activeUser.id);
    formData.append("itemIds", JSON.stringify(selectedItemIds));
    formData.append("method", paymentMethod);
    formData.append("paidAt", paymentDate);
    formData.append("reference", paymentReference);
    formData.append("note", paymentNote);
    if (paymentReceiptFile) {
      formData.append("receipt", paymentReceiptFile);
    }

    startTransition(async () => {
      const res = await markItemsAsPaidAction(formData);
      if (res.success) {
        // Update local state for immediate feedback
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== activeUser.id) return u;
            return {
              ...u,
              totalBalanceDue: 0, // Recalculated on next refresh
              items: u.items.map((item) => {
                if (!selectedItemIds.includes(item.id)) return item;
                const newAlloc: ItemAllocationDetail = {
                  id: `local-alloc-${Date.now()}-${item.id}`,
                  amountApplied: item.balance,
                  paymentId: `payment-${Date.now()}`,
                  paymentMethod,
                  paymentPaidAt: new Date(paymentDate).toISOString(),
                  paymentReference: paymentReference || null,
                  paymentFilePath: paymentReceiptFile ? "payments/temp" : null,
                  paymentMimeType: paymentReceiptFile?.type || null,
                  paymentOriginalName: paymentReceiptFile?.name || null,
                };

                return {
                  ...item,
                  paid: item.due,
                  balance: 0,
                  paymentStatus: "PAID",
                  allocations: [newAlloc, ...item.allocations],
                };
              }),
            };
          })
        );

        setFeedback({
          type: "success",
          text: res.message || "Artículos marcados como pagados con éxito.",
        });
        setIsMarkPaidOpen(false);
        setSelectedItemIds([]);
        setPaymentReceiptFile(null);
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Error al marcar artículos como pagados.",
        });
      }
    });
  };

  // Submit Unmark Payment
  const handleUnmarkPayment = (itemIds: string[]) => {
    if (!activeUser || itemIds.length === 0) return;
    if (
      !confirm(
        `¿Deseas desmarcar el pago de ${itemIds.length} artículo(s)? El saldo volverá a quedar pendiente.`
      )
    )
      return;

    startTransition(async () => {
      const res = await unmarkItemsPaymentAction(itemIds);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== activeUser.id) return u;
            return {
              ...u,
              items: u.items.map((item) => {
                if (!itemIds.includes(item.id)) return item;
                return {
                  ...item,
                  paid: 0,
                  balance: item.due,
                  paymentStatus: "UNPAID",
                  allocations: [],
                };
              }),
            };
          })
        );

        setFeedback({
          type: "success",
          text: res.message || "Pago desmarcado con éxito.",
        });
        setSelectedItemIds([]);
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Error al desmarcar pago.",
        });
      }
    });
  };

  // Quick mark single item as paid with default values
  const handleQuickMarkAsPaid = (itemId: string) => {
    if (!activeUser) return;
    const formData = new FormData();
    formData.append('userId', activeUser.id);
    formData.append('itemIds', JSON.stringify([itemId]));
    const today = new Date().toISOString().slice(0, 10);
    formData.append('method', 'Transferencia');
    formData.append('paidAt', today);
    formData.append('reference', '');
    formData.append('note', 'Marca rápida desde tabla');
    startTransition(async () => {
      const res = await markItemsAsPaidAction(formData);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.id !== activeUser.id) return u;
            return {
              ...u,
              totalBalanceDue: 0,
              items: u.items.map((item) => {
                if (item.id !== itemId) return item;
                const newAlloc: ItemAllocationDetail = {
                  id: `local-alloc-${Date.now()}-${item.id}`,
                  amountApplied: item.balance,
                  paymentId: `payment-${Date.now()}`,
                  paymentMethod: 'Transferencia',
                  paymentPaidAt: new Date(today).toISOString(),
                  paymentReference: null,
                  paymentFilePath: null,
                  paymentMimeType: null,
                  paymentOriginalName: null,
                };
                return {
                  ...item,
                  paid: item.due,
                  balance: 0,
                  paymentStatus: 'PAID',
                  allocations: [newAlloc, ...item.allocations],
                };
              }),
            };
          })
        );
        setFeedback({ type: 'success', text: res.message || 'Artículo marcado como pagado.' });
      } else {
        setFeedback({ type: 'error', text: res.error || 'Error al marcar artículo como pagado.' });
      }
    });
  };


  // Notes handling
  const handleOpenNotes = (user: SerializedAdminUser) => {
    setNotesUser(user);
    setNotesContent(user.internalNotes || "");
  };

  const handleSaveNotes = () => {
    if (!notesUser) return;
    startTransition(async () => {
      const res = await updateUserNotesAction(notesUser.id, notesContent);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === notesUser.id ? { ...u, internalNotes: notesContent } : u
          )
        );
        setFeedback({ type: "success", text: res.message || "Notas guardadas." });
        setNotesUser(null);
      } else {
        setFeedback({ type: "error", text: res.error || "Error al guardar notas." });
      }
    });
  };

  const handleToggleStatus = (user: SerializedAdminUser) => {
    if (user.role === "ADMIN") return;
    startTransition(async () => {
      const res = await toggleUserStatusAction(user.id);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, isActive: !u.isActive } : u
          )
        );
        setFeedback({ type: "success", text: res.message || "Estado actualizado." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error al actualizar estado." });
      }
    });
  };

  // Selected items total balance for marking modal
  const selectedItemsRemainingTotal = useMemo(() => {
    if (!activeUser) return 0;
    return activeUser.items
      .filter((i) => selectedItemIds.includes(i.id))
      .reduce((sum, i) => sum + Math.max(0, i.balance), 0);
  }, [activeUser, selectedItemIds]);

  // Return request handler
  const handleRequestReturn = () => {
    if (!activeUser || selectedItemIds.length === 0) return;

    startTransition(async () => {
      const res = await requestReturnAction(
        activeUser.id,
        selectedItemIds,
        returnReason
      );
      if (res.success) {
        setFeedback({ type: "success", text: res.message || "Devolución solicitada." });
        setIsReturnRequestOpen(false);
        setSelectedItemIds([]);
        setReturnReason("");
        // Add a placeholder return to local state
        const selectedItems = activeUser.items.filter((i) => selectedItemIds.includes(i.id));
        const newReturn: SerializedReturn = {
          id: `return-${Date.now()}`,
          status: "REQUESTED",
          reason: returnReason || null,
          receiptFilePath: null,
          receiptMimeType: null,
          receiptOriginalName: null,
          completedAt: null,
          createdAt: new Date().toISOString(),
          items: selectedItems.map((item) => ({
            id: `ri-${Date.now()}-${item.id}`,
            orderItemId: item.id,
            refundAmount: item.paid > 0 ? item.paid : item.due,
            snapshotName: item.snapshotName,
            snapshotSku: item.snapshotSku,
          })),
        };
        setUsers((prev) =>
          prev.map((u) =>
            u.id === activeUser.id
              ? { ...u, returns: [newReturn, ...u.returns] }
              : u
          )
        );
      } else {
        setFeedback({ type: "error", text: res.error || "Error al solicitar devolución." });
      }
    });
  };

  // Complete return handler
  const handleCompleteReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingReturn) return;

    const formData = new FormData();
    formData.append("returnId", completingReturn.id);
    if (returnReceiptFile) {
      formData.append("receipt", returnReceiptFile);
    }

    startTransition(async () => {
      const res = await completeReturnAction(formData);
      if (res.success) {
        const returnedItemIds = completingReturn.items.map((i) => i.orderItemId);
        setUsers((prev) =>
          prev.map((u) => ({
            ...u,
            items: u.items.map((item) =>
              returnedItemIds.includes(item.id)
                ? {
                    ...item,
                    status: "CANCELLED" as const,
                    quantityCancelled: item.quantity,
                    due: 0,
                    balance: 0,
                  }
                : item
            ),
            returns: u.returns.map((r) =>
              r.id === completingReturn.id
                ? {
                    ...r,
                    status: "COMPLETED" as const,
                    completedAt: new Date().toISOString(),
                    receiptFilePath: returnReceiptFile ? "returns/temp" : null,
                    receiptOriginalName: returnReceiptFile?.name || null,
                  }
                : r
            ),
          }))
        );
        setFeedback({ type: "success", text: res.message || "Devolución completada." });
        setIsCompleteReturnOpen(false);
        setCompletingReturn(null);
        setReturnReceiptFile(null);
      } else {
        setFeedback({ type: "error", text: res.error || "Error al completar devolución." });
      }
    });
  };

  // Cancel return handler
  const handleCancelReturn = (returnId: string) => {
    if (!confirm("¿Cancelar esta solicitud de devolución?")) return;
    startTransition(async () => {
      const res = await cancelReturnAction(returnId);
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => ({
            ...u,
            returns: u.returns.filter((r) => r.id !== returnId),
          }))
        );
        setFeedback({ type: "success", text: res.message || "Devolución cancelada." });
      } else {
        setFeedback({ type: "error", text: res.error || "Error al cancelar devolución." });
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Toast alert feedback */}
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

      {/* Top Search Bar */}
      <div className="bg-white rounded-[20px] border border-border p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario por nombre, email o WhatsApp..."
            className="pl-9 h-10 text-xs sm:text-sm bg-meringue/30 border-pink-200/80"
          />
        </div>

        <span className="text-xs text-ink-secondary font-medium">
          {filteredUsers.length} de {users.length} usuarios
        </span>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.map((user) => {
          const waLink = buildWhatsAppLink(
            user.whatsapp,
            `¡Hola ${user.name.split(" ")[0]}! Nos comunicamos de Rainbow Cake GO.`
          );

          return (
            <div
              key={user.id}
              onClick={() => {
                setSelectedUser(user);
                setSelectedItemIds([]);
              }}
              className="bg-white rounded-[20px] border border-border p-4 shadow-xs hover:border-pink-300 hover:shadow-card transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              {/* User Info */}
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-cotton flex items-center justify-center font-bold text-strawberry text-base border border-bubblegum/40 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>

                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-ink hover:text-strawberry transition-colors">
                      {user.name}
                    </h4>
                    {user.role === "ADMIN" && (
                      <Badge variant="outline" className="text-[10px] text-purple-700 bg-purple-50 border-purple-200 gap-1">
                        <Shield className="w-3 h-3" />
                        Admin
                      </Badge>
                    )}
                    {!user.isActive && (
                      <Badge variant="cancelled" className="text-[10px]">
                        Inactivo
                      </Badge>
                    )}
                  </div>

                  <p className="text-ink-secondary text-[11px]">
                    {user.email} • <span className="font-mono">{user.whatsapp}</span>
                  </p>

                  {user.internalNotes && (
                    <p className="text-[11px] text-amber-900 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/60 mt-1 line-clamp-1">
                      <strong>Nota:</strong> {user.internalNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Order & Payment Stats */}
              <div className="flex items-center gap-4 sm:gap-6 pl-14 sm:pl-0">
                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-ink-secondary block">Artículos solicitados</span>
                  <strong className="text-ink font-mono text-xs">
                    {user.items.length} artículo(s)
                  </strong>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-ink-secondary block">Saldo pendiente</span>
                  <strong
                    className={`font-mono text-xs ${
                      user.totalBalanceDue > 0 ? "text-strawberry font-bold" : "text-emerald-700"
                    }`}
                  >
                    {user.totalBalanceDue > 0 ? formatCurrency(user.totalBalanceDue) : "$0.00"}
                  </strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                className="flex items-center gap-2 pl-14 sm:pl-0 pt-2 sm:pt-0 self-end sm:self-center shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(user);
                    setSelectedItemIds([]);
                  }}
                  className="text-xs h-8 px-3 border-pink-200/80 bg-cotton/30 hover:bg-cotton text-strawberry font-semibold gap-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Ver artículos y pagos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenNotes(user)}
                  className="text-xs h-8 w-8 p-0 text-ink-secondary hover:text-ink"
                  title="Notas internas"
                >
                  <FileText className="w-3.5 h-3.5" />
                </Button>

                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-8 w-8 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center text-emerald-600 transition-colors"
                  title="Abrir WhatsApp"
                >
                  <MessageCircle className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* User Items & Payments Management Drawer / Modal */}
      <Dialog open={!!activeUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-5">
          <DialogHeader className="border-b border-border-light pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-cotton flex items-center justify-center font-bold text-strawberry text-sm border border-bubblegum/40">
                  {activeUser?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <DialogTitle className="text-base text-ink flex items-center gap-2">
                    {activeUser?.name}
                    <span className="font-normal text-xs text-ink-secondary">
                      ({activeUser?.email})
                    </span>
                  </DialogTitle>
                  <DialogDescription className="text-xs text-ink-secondary">
                    WhatsApp: <span className="font-mono text-ink font-semibold">{activeUser?.whatsapp}</span> • Registrado el {formatDate(activeUser?.createdAt)}
                  </DialogDescription>
                </div>
              </div>

              {/* Financial Summary Badges */}
              <div className="flex items-center gap-2 text-xs">
                <div className="bg-meringue/60 px-2.5 py-1 rounded-xl border border-pink-100 text-center">
                  <span className="text-[10px] text-ink-secondary block">Saldo por liquidar</span>
                  <strong className="text-strawberry font-mono font-bold">
                    {formatCurrency(activeUser?.totalBalanceDue || 0)}
                  </strong>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Filter Tabs & Batch Actions Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 pb-1 border-b border-border-light text-xs">
            {/* Filter pills */}
            <div className="flex gap-1.5">
              <button
                onClick={() => setItemFilter("ALL")}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  itemFilter === "ALL"
                    ? "bg-strawberry text-white"
                    : "bg-meringue/60 text-ink-secondary hover:bg-cotton"
                }`}
              >
                Todos ({activeUser?.items.length || 0})
              </button>
              <button
                onClick={() => setItemFilter("UNPAID")}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  itemFilter === "UNPAID"
                    ? "bg-strawberry text-white"
                    : "bg-meringue/60 text-ink-secondary hover:bg-cotton"
                }`}
              >
                Pendientes de pago
              </button>
              <button
                onClick={() => setItemFilter("PAID")}
                className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                  itemFilter === "PAID"
                    ? "bg-strawberry text-white"
                    : "bg-meringue/60 text-ink-secondary hover:bg-cotton"
                }`}
              >
                Pagados
              </button>
            </div>

            {/* Batch Action Buttons if items selected */}
            {selectedItemIds.length > 0 ? (
              <div className="flex items-center gap-2 animate-in fade-in duration-150">
                <Button
                  size="sm"
                  onClick={() => handleOpenMarkPaidForItems(selectedItemIds)}
                  className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Marcar {selectedItemIds.length} como pagado(s)</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnmarkPayment(selectedItemIds)}
                  className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Desmarcar pago</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setReturnReason("");
                    setIsReturnRequestOpen(true);
                  }}
                  className="text-xs h-7 text-amber-700 border-amber-200 hover:bg-amber-50 gap-1"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Devolución</span>
                </Button>
              </div>
            ) : (
              <div className="text-[11px] text-ink-secondary">
                Selecciona casillas para marcar o desmarcar pagos en lote
              </div>
            )}
          </div>

          {/* Select all check row */}
          {modalItems.length > 0 && (
            <div className="flex items-center justify-between px-1 pt-1 text-xs text-ink-secondary">
              <button
                onClick={toggleSelectAllItems}
                className="flex items-center gap-2 hover:text-ink cursor-pointer font-medium"
              >
                {isAllItemsSelected ? (
                  <CheckSquare className="w-4 h-4 text-strawberry" />
                ) : (
                  <Square className="w-4 h-4 text-ink-secondary/60" />
                )}
                <span>Seleccionar todos los mostrados ({modalItems.length})</span>
              </button>
              <span>{selectedItemIds.length} seleccionado(s)</span>
            </div>
          )}

          {/* Items List inside Drawer */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {modalItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-secondary">
                <Package className="w-8 h-8 text-bubblegum mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-ink">No hay artículos con este filtro.</p>
              </div>
            ) : (
              modalItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                const hasAllocations = item.allocations && item.allocations.length > 0;
                const isPaid = item.paymentStatus === "PAID";

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-[16px] border transition-all text-xs space-y-2.5 ${
                      isSelected
                        ? "bg-cotton/30 border-strawberry"
                        : "bg-white border-border-light hover:border-pink-200"
                    }`}
                  >
                    {/* Top line: Select + Thumbnail + Title + Pricing */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="mt-1 cursor-pointer text-ink-secondary hover:text-ink shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-strawberry" />
                          ) : (
                            <Square className="w-4 h-4 text-ink-secondary/50" />
                          )}
                        </button>

                        <div className="w-12 h-12 rounded-xl bg-cotton/50 border border-border-light overflow-hidden shrink-0 flex items-center justify-center relative">
                          {item.productImageUrl ? (
                            <Image
                              src={item.productImageUrl}
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
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-strawberry bg-cotton px-1.5 py-0.2 rounded border border-bubblegum/40">
                              {item.orderCode}
                            </span>
                            <span className="text-[11px] text-ink-secondary">
                              {formatDate(item.orderCreatedAt)}
                            </span>
                          </div>

                          <h4 className="font-semibold text-xs text-ink truncate">
                            {item.snapshotName}
                          </h4>

                          <p className="text-[11px] text-ink-secondary font-mono">
                            SKU: {item.snapshotSku} • {item.quantity} pza(s) ×{" "}
                            {formatCurrency(item.snapshotUnitPrice)}
                          </p>
                        </div>
                      </div>

                      {/* Right: Payment badge & amounts */}
                      <div className="text-right shrink-0 space-y-0.5">
                        <PaymentStatusBadge status={item.paymentStatus} className="text-[10px] px-2 py-0.2" />
                        <p className="font-bold text-xs text-ink mt-1">
                          Total: {formatCurrency(item.due)}
                        </p>
                        <p className="text-[11px] text-ink-secondary">
                          Abonado: <strong className="text-emerald-700">{formatCurrency(item.paid)}</strong>
                        </p>
                        {item.balance > 0 && (
                          <p className="text-[11px] text-strawberry font-bold">
                            Saldo: {formatCurrency(item.balance)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Attached Vouchers / Comprobantes Section */}
                    {hasAllocations && (
                      <div className="bg-cotton/30 rounded-xl p-2.5 border border-bubblegum/30 space-y-1.5">
                        <p className="text-[11px] font-bold text-ink flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-strawberry" />
                          Comprobantes / abonos registrados para este artículo:
                        </p>
                        <div className="space-y-1">
                          {item.allocations.map((alloc) => (
                            <div
                              key={alloc.id}
                              className="flex items-center justify-between gap-2 text-[11px] bg-white p-2 rounded-lg border border-border-light"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-ink">
                                  {alloc.paymentMethod || "Transferencia"}
                                </span>
                                <span className="font-mono text-emerald-700 font-bold">
                                  +{formatCurrency(alloc.amountApplied)}
                                </span>
                                <span className="text-ink-secondary">
                                  ({formatDate(alloc.paymentPaidAt)})
                                </span>
                                {alloc.paymentReference && (
                                  <span className="font-mono text-ink-secondary">
                                    Ref: {alloc.paymentReference}
                                  </span>
                                )}
                              </div>

                              <div>
                                {alloc.paymentFilePath ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const isPdf = alloc.paymentFilePath?.endsWith(".pdf") || alloc.paymentMimeType === "application/pdf";
                                      if (isPdf) {
                                        window.open(`/api/files/${alloc.paymentFilePath}`, "_blank");
                                      } else {
                                        setPreviewReceiptUrl({
                                          url: `/api/files/${alloc.paymentFilePath}`,
                                          isPdf: false,
                                          name: alloc.paymentOriginalName || "Comprobante",
                                        });
                                      }
                                    }}
                                    className="text-xs text-strawberry hover:text-strawberry-dark font-medium flex items-center gap-1 bg-cotton px-2 py-0.5 rounded border border-bubblegum/40 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" />
                                    <span>Ver captura</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-ink-secondary italic">
                                    En persona / sin foto
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Row per Item */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border-light text-xs">
                      <div className="flex items-center gap-1.5">
                        <ItemStatusBadge status={item.status} className="text-[10px]" />
                        <span className="text-[11px] text-ink-secondary">
                          {item.quantityDelivered > 0 && `Entregadas: ${item.quantityDelivered} `}
                          {item.quantityCancelled > 0 && `Canceladas: ${item.quantityCancelled}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isPaid ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnmarkPayment([item.id])}
                            className="text-xs h-7 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Desmarcar pago</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenMarkPaidForItems([item.id])}
                            className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Marcar pagado / Adjuntar foto</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Returns Section */}
          {activeUser && activeUser.returns.length > 0 && (
            <div className="border-t border-border-light pt-3 space-y-2">
              <p className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Undo2 className="w-3.5 h-3.5 text-amber-600" />
                Devoluciones ({activeUser.returns.length})
              </p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {activeUser.returns.map((ret) => {
                  const totalRefund = ret.items.reduce((s, ri) => s + ri.refundAmount, 0);
                  const isCompleted = ret.status === "COMPLETED";

                  return (
                    <div
                      key={ret.id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                        isCompleted
                          ? "bg-emerald-50/50 border-emerald-200"
                          : "bg-amber-50/50 border-amber-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              isCompleted
                                ? "text-emerald-700 border-emerald-300 bg-emerald-50"
                                : "text-amber-700 border-amber-300 bg-amber-50"
                            }`}
                          >
                            {isCompleted ? "✅ Completada" : "⏳ Pendiente"}
                          </Badge>
                          <span className="text-[11px] text-ink-secondary">
                            {formatDate(ret.createdAt)}
                          </span>
                        </div>
                        <strong className="font-mono text-sm text-ink">
                          {formatCurrency(totalRefund)}
                        </strong>
                      </div>

                      {/* Items in this return */}
                      <div className="space-y-0.5">
                        {ret.items.map((ri) => (
                          <div key={ri.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-ink">
                              {ri.snapshotName}{" "}
                              <span className="text-ink-secondary font-mono">({ri.snapshotSku})</span>
                            </span>
                            <span className="font-mono text-ink-secondary">
                              {formatCurrency(ri.refundAmount)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {ret.reason && (
                        <p className="text-[11px] text-ink-secondary">
                          <span className="font-semibold text-ink">Motivo:</span> {ret.reason}
                        </p>
                      )}

                      {/* Receipt link for completed returns */}
                      {isCompleted && ret.receiptFilePath && (
                        <a
                          href={`/api/files/${ret.receiptFilePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-strawberry hover:text-strawberry-dark bg-cotton/50 hover:bg-cotton px-2 py-0.5 rounded-lg border border-bubblegum/40 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Ver comprobante de reembolso</span>
                        </a>
                      )}

                      {/* Actions for pending returns */}
                      {!isCompleted && (
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              setCompletingReturn(ret);
                              setReturnReceiptFile(null);
                              setIsCompleteReturnOpen(true);
                            }}
                            className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Completar devolución</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancelReturn(ret.id)}
                            className="text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 gap-1"
                          >
                            <X className="w-3 h-3" />
                            <span>Cancelar</span>
                          </Button>
                        </div>
                      )}

                      {isCompleted && ret.completedAt && (
                        <p className="text-[10px] text-emerald-700">
                          Completada el {formatDate(ret.completedAt)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="border-t border-border-light pt-2">
            <Button variant="outline" onClick={() => setSelectedUser(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark As Paid & Attach Photo/Receipt Modal */}
      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmMarkAsPaid}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Marcar como pagado
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Registra el pago para <strong>{selectedItemIds.length} artículo(s)</strong> de{" "}
                <strong>{activeUser?.name}</strong>. Puedes adjuntar foto de la transferencia o marcar en efectivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              {/* Amount to settle */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <span className="font-semibold text-emerald-800">Monto total a liquidar:</span>
                <span className="text-base font-bold font-mono text-emerald-900">
                  {formatCurrency(selectedItemsRemainingTotal)}
                </span>
              </div>

              {/* Payment Method */}
              <div className="space-y-1">
                <label className="font-semibold text-ink">Método de pago *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden"
                >
                  <option value="Transferencia">💳 Transferencia bancaria (SPEI)</option>
                  <option value="Efectivo en persona">💵 Efectivo en persona</option>
                  <option value="Depósito en efectivo">🏦 Depósito OXXO / Banco</option>
                  <option value="Otro">📝 Otro</option>
                </select>
              </div>

              {/* Receipt File Upload */}
              <div className="space-y-1">
                <label className="font-semibold text-ink flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-strawberry" />
                  Adjuntar foto o comprobante (opcional: JPG, PNG o PDF)
                </label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setPaymentReceiptFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
                <p className="text-[11px] text-ink-secondary">
                  Si fue en efectivo en persona, puedes dejar este campo vacío.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Fecha del pago</label>
                  <Input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Folio / Referencia</label>
                  <Input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Ej. AUT-12345"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Nota interna (opcional)</label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Ej. Pagado en entrega Metro Insurgentes"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsMarkPaidOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending ? "Registrando..." : "Confirmar y marcar pagado"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full Photo Receipt Preview Modal */}
      <Dialog
        open={!!previewReceiptUrl}
        onOpenChange={(open) => !open && setPreviewReceiptUrl(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-ink">
              Comprobante de pago: {previewReceiptUrl?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto flex items-center justify-center p-2 bg-meringue/30 rounded-xl border border-pink-100 min-h-[300px]">
            {previewReceiptUrl && (
              <img
                src={previewReceiptUrl.url}
                alt="Comprobante de pago"
                className="max-h-[70vh] object-contain rounded-lg shadow-sm"
              />
            )}
          </div>

          <DialogFooter className="flex justify-between items-center sm:justify-between">
            <a
              href={previewReceiptUrl?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-strawberry font-semibold flex items-center gap-1 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir en tamaño completo</span>
            </a>

            <Button variant="outline" size="sm" onClick={() => setPreviewReceiptUrl(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal Notes Modal */}
      <Dialog open={!!notesUser} onOpenChange={(open) => !open && setNotesUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-strawberry" />
              Notas internas de cliente
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              Cliente: <strong>{notesUser?.name}</strong> ({notesUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-ink-secondary">
              Estas notas son privadas y únicamente visibles por el administrador (ej. preferencias de entrega, puntos de encuentro acordados, recordatorios).
            </p>
            <Textarea
              rows={4}
              value={notesContent}
              onChange={(e) => setNotesContent(e.target.value)}
              placeholder="Escribe notas sobre este cliente..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setNotesUser(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveNotes}
              disabled={isPending}
              className="bg-strawberry hover:bg-strawberry-dark text-white"
            >
              {isPending ? "Guardando..." : "Guardar notas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Request Modal */}
      <Dialog open={isReturnRequestOpen} onOpenChange={setIsReturnRequestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Undo2 className="w-5 h-5 text-amber-600" />
              Solicitar devolución
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              Se solicitará la devolución de{" "}
              <strong>{selectedItemIds.length} artículo(s)</strong> de{" "}
              <strong>{activeUser?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs">
            {/* Selected items summary */}
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1.5">
              <p className="font-semibold text-amber-800">
                Artículos seleccionados para devolución:
              </p>
              {activeUser?.items
                .filter((i) => selectedItemIds.includes(i.id))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <span className="text-amber-900">
                      {item.snapshotName}{" "}
                      <span className="font-mono text-amber-700">
                        ({item.snapshotSku})
                      </span>
                    </span>
                    <span className="font-mono font-bold text-amber-900">
                      {formatCurrency(item.paid > 0 ? item.paid : item.due)}
                    </span>
                  </div>
                ))}
              <div className="border-t border-amber-300 pt-1 flex items-center justify-between">
                <span className="font-bold text-amber-900">Total a reembolsar:</span>
                <span className="font-mono font-bold text-base text-amber-900">
                  {formatCurrency(
                    activeUser?.items
                      .filter((i) => selectedItemIds.includes(i.id))
                      .reduce((s, i) => s + (i.paid > 0 ? i.paid : i.due), 0) || 0
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-ink">
                Motivo de la devolución (opcional)
              </label>
              <Textarea
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Ej. Artículo dañado, cambió de opinión, pedido duplicado..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReturnRequestOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRequestReturn}
              disabled={isPending || selectedItemIds.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending ? "Procesando..." : "Confirmar devolución"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Return Modal */}
      <Dialog open={isCompleteReturnOpen} onOpenChange={setIsCompleteReturnOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCompleteReturn}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Completar devolución
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Marca esta devolución como completada. Puedes adjuntar un comprobante de
                reembolso (transferencia, captura de pantalla, etc.).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              {/* Return items summary */}
              {completingReturn && (
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 space-y-1.5">
                  <p className="font-semibold text-emerald-800">
                    Artículos en esta devolución:
                  </p>
                  {completingReturn.items.map((ri) => (
                    <div
                      key={ri.id}
                      className="flex items-center justify-between text-[11px]"
                    >
                      <span className="text-emerald-900">
                        {ri.snapshotName}{" "}
                        <span className="font-mono text-emerald-700">
                          ({ri.snapshotSku})
                        </span>
                      </span>
                      <span className="font-mono font-bold text-emerald-900">
                        {formatCurrency(ri.refundAmount)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-emerald-300 pt-1 flex items-center justify-between">
                    <span className="font-bold text-emerald-900">
                      Total reembolso:
                    </span>
                    <span className="font-mono font-bold text-base text-emerald-900">
                      {formatCurrency(
                        completingReturn.items.reduce(
                          (s, ri) => s + ri.refundAmount,
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Receipt upload */}
              <div className="space-y-1">
                <label className="font-semibold text-ink flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-strawberry" />
                  Comprobante de reembolso (opcional: JPG, PNG o PDF)
                </label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) =>
                    setReturnReceiptFile(e.target.files?.[0] || null)
                  }
                  className="text-xs"
                />
                <p className="text-[11px] text-ink-secondary">
                  Adjunta la captura de la transferencia de reembolso o
                  comprobante del reintegro.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCompleteReturnOpen(false);
                  setCompletingReturn(null);
                }}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isPending ? "Procesando..." : "Marcar como completada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
