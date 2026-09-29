"use client";

import { useState, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCard,
  Search,
  Plus,
  FileText,
  MessageCircle,
  Trash2,
  Pencil,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Filter,
  DollarSign,
  User as UserIcon,
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
import {
  createAdminPaymentAction,
  allocatePaymentAction,
  deletePaymentAction,
  editPaymentAction,
} from "@/actions/admin/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { calculateAmountDue, calculateTotalPaid } from "@/lib/domain/payment";

export interface SerializedAdminPayment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  paidAt: string;
  amount: number;
  method: string | null;
  reference: string | null;
  note: string | null;
  filePath: string | null;
  mimeType: string | null;
  originalName: string | null;
  createdAt: string;
  allocations: {
    id: string;
    orderItemId: string;
    amountApplied: number;
  }[];
}

export interface UserOrderItemForAllocation {
  id: string;
  orderId: string;
  orderCode: string;
  snapshotName: string;
  snapshotSku: string;
  snapshotUnitPrice: number;
  quantity: number;
  quantityCancelled: number;
  status: string;
  totalPaid: number;
  allocations: {
    id: string;
    paymentId: string;
    amountApplied: number;
  }[];
}

export interface UserForPayment {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  orderItems: UserOrderItemForAllocation[];
}

interface PaymentsManagerProps {
  payments: SerializedAdminPayment[];
  users: UserForPayment[];
}

export function PaymentsManager({
  payments: initialPayments,
  users,
}: PaymentsManagerProps) {
  const [payments, setPayments] = useState<SerializedAdminPayment[]>(initialPayments);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "UNALLOCATED" | "ALLOCATED">("ALL");

  // New Payment Modal
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [newPaymentUserId, setNewPaymentUserId] = useState(users[0]?.id || "");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentMethod, setNewPaymentMethod] = useState("Transferencia");
  const [newPaymentReference, setNewPaymentReference] = useState("");
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [newPaymentFile, setNewPaymentFile] = useState<File | null>(null);

  // Allocation Modal
  const [allocatingPayment, setAllocatingPayment] = useState<SerializedAdminPayment | null>(null);
  const [allocationInputs, setAllocationInputs] = useState<Record<string, number>>({});

  // Receipt Preview Modal
  const [previewReceipt, setPreviewReceipt] = useState<{
    url: string;
    isPdf: boolean;
    name: string;
  } | null>(null);

  // Delete confirmation
  const [paymentToDelete, setPaymentToDelete] = useState<SerializedAdminPayment | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit Payment Modal
  const [editingPayment, setEditingPayment] = useState<SerializedAdminPayment | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMethod, setEditMethod] = useState("Transferencia");
  const [editReference, setEditReference] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editRemoveReceipt, setEditRemoveReceipt] = useState(false);

  // Calculations
  const paymentsWithTotals = useMemo(() => {
    return payments.map((p) => {
      const allocated = p.allocations.reduce((sum, a) => sum + a.amountApplied, 0);
      const unallocated = Math.max(0, p.amount - allocated);
      return {
        ...p,
        allocated,
        unallocated,
      };
    });
  }, [payments]);

  const totalCollected = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }, [payments]);

  const totalAllocated = useMemo(() => {
    return paymentsWithTotals.reduce((sum, p) => sum + p.allocated, 0);
  }, [paymentsWithTotals]);

  const totalUnallocated = useMemo(() => {
    return paymentsWithTotals.reduce((sum, p) => sum + p.unallocated, 0);
  }, [paymentsWithTotals]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return paymentsWithTotals.filter((p) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          p.userName.toLowerCase().includes(q) ||
          p.userEmail.toLowerCase().includes(q) ||
          p.userPhone.toLowerCase().includes(q) ||
          (p.reference && p.reference.toLowerCase().includes(q)) ||
          (p.note && p.note.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (filterType === "UNALLOCATED" && p.unallocated <= 0.01) return false;
      if (filterType === "ALLOCATED" && p.unallocated > 0.01) return false;

      return true;
    });
  }, [paymentsWithTotals, search, filterType]);

  // Handle open allocation modal
  const handleOpenAllocation = (payment: SerializedAdminPayment) => {
    setAllocatingPayment(payment);
    const initialInputs: Record<string, number> = {};
    for (const alloc of payment.allocations) {
      initialInputs[alloc.orderItemId] = alloc.amountApplied;
    }
    setAllocationInputs(initialInputs);
  };

  // Quick fill remaining balance on an item
  const handleQuickFill = (
    itemId: string,
    remainingItemDue: number,
    paymentTotalAmount: number
  ) => {
    const currentAllocatedElsewhere = Object.entries(allocationInputs).reduce(
      (sum, [id, val]) => (id === itemId ? sum : sum + (val || 0)),
      0
    );
    const availableFromPayment = Math.max(0, paymentTotalAmount - currentAllocatedElsewhere);
    const toAllocate = Math.min(remainingItemDue, availableFromPayment);

    setAllocationInputs((prev) => ({
      ...prev,
      [itemId]: Math.round(toAllocate * 100) / 100,
    }));
  };

  // Submit allocation
  const handleSaveAllocation = () => {
    if (!allocatingPayment) return;

    const payload = Object.entries(allocationInputs)
      .filter(([_, val]) => val > 0)
      .map(([orderItemId, amountApplied]) => ({
        orderItemId,
        amountApplied,
      }));

    startTransition(async () => {
      const res = await allocatePaymentAction(allocatingPayment.id, payload);
      if (res.success) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === allocatingPayment.id
              ? {
                  ...p,
                  allocations: payload.map((alloc) => ({
                    id: `alloc-${Date.now()}-${alloc.orderItemId}`,
                    orderItemId: alloc.orderItemId,
                    amountApplied: alloc.amountApplied,
                  })),
                }
              : p
          )
        );
        setActionFeedback({
          type: "success",
          text: res.message || "Asignación guardada con éxito.",
        });
        setAllocatingPayment(null);
      } else {
        setActionFeedback({
          type: "error",
          text: res.error || "Error al asignar comprobante.",
        });
      }
    });
  };

  // Submit new payment
  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentUserId || !newPaymentAmount || parseFloat(newPaymentAmount) <= 0) {
      setActionFeedback({ type: "error", text: "Introduce un cliente y un monto válido." });
      return;
    }

    const formData = new FormData();
    formData.append("userId", newPaymentUserId);
    formData.append("amount", newPaymentAmount);
    formData.append("method", newPaymentMethod);
    formData.append("reference", newPaymentReference);
    formData.append("note", newPaymentNote);
    formData.append("paidAt", newPaymentDate);
    if (newPaymentFile) {
      formData.append("receipt", newPaymentFile);
    }

    startTransition(async () => {
      const res = await createAdminPaymentAction(formData);
      if (res.success && res.paymentId) {
        const selectedUser = users.find((u) => u.id === newPaymentUserId);
        const newPaymentObj: SerializedAdminPayment = {
          id: res.paymentId,
          userId: newPaymentUserId,
          userName: selectedUser?.name || "Cliente",
          userEmail: selectedUser?.email || "",
          userPhone: selectedUser?.whatsapp || "",
          paidAt: new Date(newPaymentDate).toISOString(),
          amount: parseFloat(newPaymentAmount),
          method: newPaymentMethod,
          reference: newPaymentReference || null,
          note: newPaymentNote || null,
          filePath: newPaymentFile ? `payments/pending` : null,
          mimeType: newPaymentFile ? newPaymentFile.type : null,
          originalName: newPaymentFile ? newPaymentFile.name : null,
          createdAt: new Date().toISOString(),
          allocations: [],
        };

        setPayments((prev) => [newPaymentObj, ...prev]);
        setActionFeedback({ type: "success", text: res.message || "Pago registrado con éxito." });
        setIsNewPaymentOpen(false);
        setNewPaymentAmount("");
        setNewPaymentReference("");
        setNewPaymentNote("");
        setNewPaymentFile(null);
      } else {
        setActionFeedback({ type: "error", text: res.error || "Error al registrar pago." });
      }
    });
  };

  // Delete payment
  const handleDeletePayment = () => {
    if (!paymentToDelete) return;
    startTransition(async () => {
      const res = await deletePaymentAction(paymentToDelete.id);
      if (res.success) {
        setPayments((prev) => prev.filter((p) => p.id !== paymentToDelete.id));
        setActionFeedback({ type: "success", text: res.message || "Pago eliminado." });
        setPaymentToDelete(null);
      } else {
        setActionFeedback({ type: "error", text: res.error || "Error al eliminar pago." });
      }
    });
  };

  // Open edit modal
  const handleOpenEdit = (payment: SerializedAdminPayment) => {
    setEditingPayment(payment);
    setEditAmount(String(payment.amount));
    setEditMethod(payment.method || "Transferencia");
    setEditReference(payment.reference || "");
    setEditNote(payment.note || "");
    setEditDate(new Date(payment.paidAt).toISOString().slice(0, 10));
    setEditFile(null);
    setEditRemoveReceipt(false);
  };

  // Submit edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    const formData = new FormData();
    formData.append("paymentId", editingPayment.id);
    formData.append("amount", editAmount);
    formData.append("method", editMethod);
    formData.append("reference", editReference);
    formData.append("note", editNote);
    formData.append("paidAt", editDate);
    if (editFile) {
      formData.append("receipt", editFile);
    }
    if (editRemoveReceipt) {
      formData.append("removeReceipt", "true");
    }

    startTransition(async () => {
      const res = await editPaymentAction(formData);
      if (res.success) {
        setPayments((prev) =>
          prev.map((p) =>
            p.id === editingPayment.id
              ? {
                  ...p,
                  amount: parseFloat(editAmount),
                  method: editMethod,
                  reference: editReference || null,
                  note: editNote || null,
                  paidAt: new Date(editDate).toISOString(),
                  filePath: editRemoveReceipt ? null : (editFile ? "payments/updated" : p.filePath),
                  mimeType: editRemoveReceipt ? null : (editFile ? editFile.type : p.mimeType),
                  originalName: editRemoveReceipt ? null : (editFile ? editFile.name : p.originalName),
                }
              : p
          )
        );
        setActionFeedback({ type: "success", text: res.message || "Pago actualizado." });
        setEditingPayment(null);
      } else {
        setActionFeedback({ type: "error", text: res.error || "Error al editar pago." });
      }
    });
  };

  // Find user for the currently allocating payment
  const allocatingUser = users.find((u) => u.id === allocatingPayment?.userId);
  const currentModalAllocatedSum = Object.values(allocationInputs).reduce(
    (sum, val) => sum + (val || 0),
    0
  );
  const currentModalRemaining = allocatingPayment
    ? Math.max(0, allocatingPayment.amount - currentModalAllocatedSum)
    : 0;

  return (
    <div className="space-y-5">
      {/* Alert toast feedback */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-[18px] border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary font-medium">Total cobrado</span>
            <div className="w-8 h-8 rounded-full bg-cotton flex items-center justify-center text-strawberry">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display text-ink mt-2">
            {formatCurrency(totalCollected)}
          </p>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            {payments.length} comprobante(s) registrado(s)
          </p>
        </div>

        <div className="bg-white rounded-[18px] border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary font-medium">Asignado a artículos</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display text-emerald-700 mt-2">
            {formatCurrency(totalAllocated)}
          </p>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            Aplicado a saldos de clientes
          </p>
        </div>

        <div className="bg-white rounded-[18px] border border-border p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-secondary font-medium">Por asignar</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-display text-amber-700 mt-2">
            {formatCurrency(totalUnallocated)}
          </p>
          <p className="text-[11px] text-ink-secondary mt-0.5">
            Comprobantes con saldo libre
          </p>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="bg-white rounded-[20px] border border-border p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, email, teléfono o referencia..."
              className="pl-9 h-10 text-xs sm:text-sm bg-meringue/30 border-pink-200/80"
            />
          </div>

          <Button
            onClick={() => setIsNewPaymentOpen(true)}
            className="text-xs h-10 bg-strawberry hover:bg-strawberry-dark text-white gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar pago</span>
          </Button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-border-light">
          <button
            onClick={() => setFilterType("ALL")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterType === "ALL"
                ? "bg-strawberry text-white"
                : "bg-meringue/60 text-ink-secondary hover:bg-cotton"
            }`}
          >
            Todos ({payments.length})
          </button>
          <button
            onClick={() => setFilterType("UNALLOCATED")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterType === "UNALLOCATED"
                ? "bg-strawberry text-white"
                : "bg-meringue/60 text-ink-secondary hover:bg-cotton"
            }`}
          >
            Con saldo libre
          </button>
          <button
            onClick={() => setFilterType("ALLOCATED")}
            className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors ${
              filterType === "ALLOCATED"
                ? "bg-strawberry text-white"
                : "bg-meringue/60 text-ink-secondary hover:bg-cotton"
            }`}
          >
            Totalmente asignados
          </button>
        </div>
      </div>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-[20px] border border-border p-12 text-center text-ink-secondary">
          <CreditCard className="w-10 h-10 text-bubblegum mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-ink">No hay comprobantes de pago registrados</p>
          <p className="text-xs mt-1">Los pagos subidos por clientes o registrados por admin aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => {
            const isFull = payment.unallocated <= 0.01;
            const waLink = buildWhatsAppLink(
              payment.userPhone,
              `¡Hola ${payment.userName.split(" ")[0]}! Nos comunicamos de Rainbow Cake GO sobre tu comprobante de pago de ${formatCurrency(payment.amount)}.`
            );

            return (
              <div
                key={payment.id}
                className="bg-white rounded-[20px] border border-border p-4 shadow-xs hover:border-pink-300 transition-colors space-y-3"
              >
                {/* Header: User + Date + Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-light pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-cotton flex items-center justify-center font-bold text-strawberry text-xs border border-bubblegum/40">
                      {payment.userName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-ink">{payment.userName}</h4>
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <MessageCircle className="w-3.5 h-3.5 fill-emerald-600" />
                        </a>
                      </div>
                      <p className="text-[11px] text-ink-secondary">
                        {payment.userEmail} • {payment.userPhone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge variant="outline" className="text-xs">
                      {payment.method || "Transferencia"}
                    </Badge>
                    <span className="text-xs text-ink-secondary">
                      {formatDate(payment.paidAt)}
                    </span>
                  </div>
                </div>

                {/* Amounts Breakdown */}
                <div className="grid grid-cols-3 gap-2 bg-meringue/40 p-2.5 rounded-xl border border-pink-100 text-xs text-center">
                  <div>
                    <span className="text-[11px] text-ink-secondary block">Monto comprobante</span>
                    <strong className="text-sm text-ink font-bold font-mono">
                      {formatCurrency(payment.amount)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-secondary block">Asignado</span>
                    <strong className="text-sm text-emerald-700 font-bold font-mono">
                      {formatCurrency(payment.allocated)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-secondary block">Saldo libre</span>
                    <strong
                      className={`text-sm font-bold font-mono ${
                        isFull ? "text-ink-secondary" : "text-amber-700"
                      }`}
                    >
                      {formatCurrency(payment.unallocated)}
                    </strong>
                  </div>
                </div>

                {/* Details (Reference & Note) */}
                {(payment.reference || payment.note) && (
                  <div className="text-xs text-ink-secondary space-y-0.5 pt-0.5">
                    {payment.reference && (
                      <p>
                        <span className="font-semibold text-ink">Folio / Ref:</span>{" "}
                        <span className="font-mono">{payment.reference}</span>
                      </p>
                    )}
                    {payment.note && (
                      <p>
                        <span className="font-semibold text-ink">Nota:</span> {payment.note}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div>
                    {payment.filePath ? (
                      <a
                        href={`/api/files/${payment.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-strawberry hover:text-strawberry-dark bg-cotton/50 hover:bg-cotton px-2.5 py-1 rounded-lg border border-bubblegum/40 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver comprobante</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-secondary italic">
                        Pago registrado en efectivo / sin comprobante
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAllocation(payment)}
                      className="text-xs h-8 gap-1.5 border-pink-200/80 hover:bg-cotton/40 text-ink"
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-strawberry" />
                      <span>Asignar a artículos ({payment.allocations.length})</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(payment)}
                      className="text-xs h-8 w-8 p-0 text-ink-secondary hover:text-strawberry"
                      title="Editar pago"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPaymentToDelete(payment)}
                      className="text-xs h-8 w-8 p-0 text-ink-secondary hover:text-rose-600"
                      title="Eliminar pago"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Payment Modal */}
      <Dialog open={isNewPaymentOpen} onOpenChange={setIsNewPaymentOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCreatePayment}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-strawberry" />
                Registrar nuevo pago
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Registra un pago recibido en cuenta bancaria, OXXO o en efectivo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-ink">Cliente</label>
                <select
                  value={newPaymentUserId}
                  onChange={(e) => setNewPaymentUserId(e.target.value)}
                  required
                  aria-label="Seleccionar cliente"
                  className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden focus:border-strawberry focus:ring-1 focus:ring-strawberry/20"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.whatsapp} - {u.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Monto ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Método de pago</label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                    aria-label="Seleccionar método de pago"
                    className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Depósito en efectivo">Depósito en efectivo</option>
                    <option value="Efectivo en persona">Efectivo en persona</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Fecha del pago</label>
                  <Input
                    type="date"
                    required
                    value={newPaymentDate}
                    onChange={(e) => setNewPaymentDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Folio / Referencia (opcional)</label>
                  <Input
                    value={newPaymentReference}
                    onChange={(e) => setNewPaymentReference(e.target.value)}
                    placeholder="Ej. AUT-89412"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">
                  Comprobante adjunto (opcional: JPG, PNG o PDF)
                </label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setNewPaymentFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Notas adicionales (opcional)</label>
                <Input
                  value={newPaymentNote}
                  onChange={(e) => setNewPaymentNote(e.target.value)}
                  placeholder="Ej. Pago correspondiente a apartado de funkos"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewPaymentOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-strawberry hover:bg-strawberry-dark text-white"
              >
                {isPending ? "Guardando..." : "Guardar pago"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Allocation Modal */}
      <Dialog
        open={!!allocatingPayment}
        onOpenChange={(open) => !open && setAllocatingPayment(null)}
      >
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-strawberry" />
              Asignar pago a artículos
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              Cliente: <strong>{allocatingPayment?.userName}</strong> • Monto total comprobante:{" "}
              <strong className="text-ink font-mono font-bold">
                {formatCurrency(allocatingPayment?.amount || 0)}
              </strong>
            </DialogDescription>
          </DialogHeader>

          {/* Balance Tracker Sticky Bar */}
          <div className="bg-meringue/60 p-3 rounded-xl border border-pink-200/80 text-xs flex items-center justify-between">
            <div>
              <span className="text-ink-secondary block text-[11px]">Asignado en este diálogo:</span>
              <strong className="font-mono text-ink text-sm">
                {formatCurrency(currentModalAllocatedSum)}
              </strong>
            </div>

            <div className="text-right">
              <span className="text-ink-secondary block text-[11px]">Restante sin asignar:</span>
              <strong
                className={`font-mono text-sm font-bold ${
                  currentModalRemaining > 0 ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {formatCurrency(currentModalRemaining)}
              </strong>
            </div>
          </div>

          {/* Order Items list for this user */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {!allocatingUser || allocatingUser.orderItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink-secondary">
                Este cliente no tiene artículos registrados.
              </div>
            ) : (
              allocatingUser.orderItems.map((item) => {
                const due = calculateAmountDue({
                  quantity: item.quantity,
                  quantityCancelled: item.quantityCancelled,
                  snapshotUnitPrice: item.snapshotUnitPrice,
                });

                // Total paid excluding current payment's allocation (so we see what's actually pending from others)
                const paidByOthers = item.allocations
                  .filter((a) => a.paymentId !== allocatingPayment?.id)
                  .reduce((sum, a) => sum + a.amountApplied, 0);

                const remainingDue = Math.max(0, due - paidByOthers);
                const currentApplied = allocationInputs[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-border-light shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] bg-cotton text-strawberry px-1.5 py-0.2 rounded font-bold">
                            {item.orderCode}
                          </span>
                          <span className="font-semibold text-ink">{item.snapshotName}</span>
                        </div>
                        <p className="text-[11px] text-ink-secondary font-mono mt-0.5">
                          SKU: {item.snapshotSku} • {item.quantity} pza(s) ×{" "}
                          {formatCurrency(item.snapshotUnitPrice)}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-ink-secondary block">Saldo debido:</span>
                        <strong className="text-strawberry font-mono font-bold">
                          {formatCurrency(remainingDue)}
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border-light">
                      <div className="flex-1">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-secondary text-xs">
                            $
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max={allocatingPayment?.amount || 0}
                            value={currentApplied || ""}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setAllocationInputs((prev) => ({
                                ...prev,
                                [item.id]: val,
                              }));
                            }}
                            placeholder="0.00"
                            className="pl-6 h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleQuickFill(
                            item.id,
                            remainingDue,
                            allocatingPayment?.amount || 0
                          )
                        }
                        className="text-xs h-8 px-2.5 border-pink-200/80 hover:bg-cotton text-strawberry shrink-0"
                      >
                        Liquidar ({formatCurrency(remainingDue)})
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border-light">
            <Button
              variant="outline"
              onClick={() => setAllocatingPayment(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveAllocation}
              disabled={isPending || currentModalAllocatedSum > (allocatingPayment?.amount || 0)}
              className="bg-strawberry hover:bg-strawberry-dark text-white"
            >
              {isPending ? "Guardando..." : "Guardar asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={!!paymentToDelete}
        onOpenChange={(open) => !open && setPaymentToDelete(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="w-5 h-5 text-rose-500" />
              Eliminar comprobante de pago
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-secondary pt-1">
              ¿Estás seguro de que deseas eliminar este pago de{" "}
              <strong>{formatCurrency(paymentToDelete?.amount || 0)}</strong> de{" "}
              <strong>{paymentToDelete?.userName}</strong>?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
            Se eliminarán las asignaciones hechas a los artículos de este pedido y el archivo físico del comprobante. Esta acción no se puede deshacer.
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPaymentToDelete(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePayment}
              disabled={isPending}
            >
              {isPending ? "Eliminando..." : "Sí, eliminar pago"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Modal */}
      <Dialog
        open={!!editingPayment}
        onOpenChange={(open) => !open && setEditingPayment(null)}
      >
        <DialogContent className="max-w-md">
          <form onSubmit={handleSaveEdit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-strawberry" />
                Editar pago
              </DialogTitle>
              <DialogDescription className="text-xs text-ink-secondary pt-1">
                Cliente: <strong>{editingPayment?.userName}</strong> •
                Registrado el {formatDate(editingPayment?.createdAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Monto ($) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    placeholder="0.00"
                    className="text-sm font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Método de pago</label>
                  <select
                    value={editMethod}
                    onChange={(e) => setEditMethod(e.target.value)}
                    aria-label="Seleccionar método de pago"
                    className="w-full h-10 px-3 rounded-xl border border-pink-200/80 bg-white text-xs text-ink outline-hidden"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Depósito en efectivo">Depósito en efectivo</option>
                    <option value="Efectivo en persona">Efectivo en persona</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-ink">Fecha del pago</label>
                  <Input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-ink">Folio / Referencia</label>
                  <Input
                    value={editReference}
                    onChange={(e) => setEditReference(e.target.value)}
                    placeholder="Ej. AUT-89412"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Current receipt info */}
              {editingPayment?.filePath && !editRemoveReceipt && (
                <div className="flex items-center justify-between bg-cotton/50 p-2.5 rounded-xl border border-bubblegum/30 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-strawberry" />
                    <span className="text-ink font-medium">
                      {editingPayment.originalName || "Comprobante adjunto"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditRemoveReceipt(true)}
                    className="text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                </div>
              )}

              {editRemoveReceipt && (
                <div className="flex items-center justify-between bg-rose-50 p-2.5 rounded-xl border border-rose-200 text-xs">
                  <span className="text-rose-700 font-medium">Se eliminará el comprobante actual</span>
                  <button
                    type="button"
                    onClick={() => setEditRemoveReceipt(false)}
                    className="text-ink-secondary hover:text-ink font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-ink">
                  {editingPayment?.filePath && !editRemoveReceipt
                    ? "Reemplazar comprobante (opcional)"
                    : "Adjuntar comprobante (opcional: JPG, PNG o PDF)"}
                </label>
                <Input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-ink">Notas (opcional)</label>
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ej. Pago parcial de apartado"
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingPayment(null)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-strawberry hover:bg-strawberry-dark text-white"
              >
                {isPending ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
