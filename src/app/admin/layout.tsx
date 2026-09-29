import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/actions/auth";
import { LayoutDashboard, Package, ShoppingCart, Users, Settings, LogOut, Layers, CreditCard, MessageCircle } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/login?from=/admin");
  }

  return (
    <div className="min-h-screen bg-meringue flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-pink-200/80 p-4 space-y-6">
        <Link href="/admin">
          <Logo size="md" />
        </Link>

        <div className="px-3 py-2 bg-meringue/60 rounded-xl border border-pink-100">
          <span className="text-[11px] font-semibold uppercase text-strawberry tracking-wider block">
            Panel Administrador
          </span>
          <p className="text-xs font-medium text-ink truncate mt-0.5">
            {user.name}
          </p>
        </div>

        <nav className="flex-1 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium bg-cotton text-strawberry"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Inicio</span>
          </Link>
          <Link
            href="/admin/items"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <Package className="w-4 h-4" />
            <span>Artículos</span>
          </Link>
          <Link
            href="/admin/payments"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pagos y Saldos</span>
          </Link>
          <Link
            href="/admin/whatsapp"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Difusión WhatsApp</span>
          </Link>
          <Link
            href="/admin/products"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Productos</span>
          </Link>
          <Link
            href="/admin/categories"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <Layers className="w-4 h-4" />
            <span>Categorías</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <Users className="w-4 h-4" />
            <span>Usuarios</span>
          </Link>
          <Link
            href="/admin/settings"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-ink-secondary hover:text-ink hover:bg-meringue"
          >
            <Settings className="w-4 h-4" />
            <span>Configuración</span>
          </Link>
        </nav>

        <div className="pt-4 border-t border-pink-100">
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-pink-200/80 p-3 flex items-center justify-between">
        <Link href="/admin">
          <Logo size="sm" />
        </Link>
        <form action={logoutAction}>
          <Button type="submit" variant="ghost" size="sm" className="text-rose-600">
            <LogOut className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
