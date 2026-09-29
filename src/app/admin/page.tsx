export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Package, ShoppingBag, Users, Clock, ArrowRight } from "lucide-react";

export const metadata = {
  title: "Panel de Administración — Rainbow Cake GO",
};

export default async function AdminDashboardPage() {
  const [userCount, orderCount, itemsByStatus] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.order.count(),
    prisma.orderItem.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const statusMap = new Map(
    itemsByStatus.map((item) => [item.status, item._count._all])
  );

  const pendingCount = statusMap.get("PENDING") || 0;
  const inTransitCount = statusMap.get("IN_TRANSIT") || 0;
  const inWarehouseCount = statusMap.get("IN_WAREHOUSE") || 0;
  const deliveredCount = statusMap.get("DELIVERED") || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-ink">
          Panel de Control
        </h1>
        <p className="text-sm text-ink-secondary mt-1">
          Resumen general de pedidos, artículos y clientes
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-secondary">Pendientes</span>
              <span className="p-2 rounded-xl bg-neutral-100 text-neutral-700">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-ink">
                {pendingCount}
              </span>
              <p className="text-[11px] text-ink-secondary mt-0.5">Artículos por procesar</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700">En tránsito</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Package className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-ink">
                {inTransitCount}
              </span>
              <p className="text-[11px] text-ink-secondary mt-0.5">En camino al país/almacén</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-700">En almacén</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <ShoppingBag className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-ink">
                {inWarehouseCount}
              </span>
              <p className="text-[11px] text-ink-secondary mt-0.5">Listos para coordinar entrega</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">Entregados</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <Package className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-bold font-display text-ink">
                {deliveredCount}
              </span>
              <p className="text-[11px] text-ink-secondary mt-0.5">Completados con éxito</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats and actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Accesos rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/items"
              className="flex items-center justify-between p-3 rounded-xl border border-pink-200/60 hover:bg-cotton/30 transition-colors"
            >
              <div>
                <h4 className="text-sm font-semibold text-ink">Gestión de Artículos</h4>
                <p className="text-xs text-ink-secondary">Ver tabla con filtros y cambios de estado</p>
              </div>
              <ArrowRight className="w-4 h-4 text-strawberry" />
            </Link>

            <Link
              href="/admin/products"
              className="flex items-center justify-between p-3 rounded-xl border border-pink-200/60 hover:bg-cotton/30 transition-colors"
            >
              <div>
                <h4 className="text-sm font-semibold text-ink">Catálogo de Productos</h4>
                <p className="text-xs text-ink-secondary">Crear productos, imágenes y ofertas</p>
              </div>
              <ArrowRight className="w-4 h-4 text-strawberry" />
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 rounded-xl border border-pink-200/60 hover:bg-cotton/30 transition-colors"
            >
              <div>
                <h4 className="text-sm font-semibold text-ink">Directorio de Usuarios</h4>
                <p className="text-xs text-ink-secondary">{userCount} usuarios registrados con WhatsApp</p>
              </div>
              <ArrowRight className="w-4 h-4 text-strawberry" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumen del sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-pink-100 text-sm">
              <span className="text-ink-secondary">Total de pedidos creados</span>
              <span className="font-semibold text-ink">{orderCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-pink-100 text-sm">
              <span className="text-ink-secondary">Clientes registrados</span>
              <span className="font-semibold text-ink">{userCount}</span>
            </div>
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-ink-secondary">Base de datos</span>
              <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200">
                PostgreSQL 18 (Conectada)
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
