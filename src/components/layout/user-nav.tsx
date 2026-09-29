"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store, ShoppingBag, Package, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";

interface UserNavProps {
  cartItemCount?: number;
}

export function UserBottomNav({ cartItemCount }: UserNavProps) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const effectiveCount = cartItemCount ?? totalItems;

  const links = [
    { href: "/catalog", label: "Catálogo", icon: Store },
    { href: "/cart", label: "Carrito", icon: ShoppingBag, count: effectiveCount },
    { href: "/orders", label: "Mis pedidos", icon: Package },
    { href: "/profile", label: "Perfil", icon: User },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-pink-200/80 px-2 py-1.5 sm:hidden"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-[64px] min-h-[48px] px-2 py-1 rounded-xl text-xs font-medium transition-colors",
                isActive
                  ? "text-strawberry"
                  : "text-ink-secondary hover:text-ink hover:bg-meringue/60"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive ? "stroke-[2.5]" : "stroke-2")} />
                {link.count !== undefined && link.count > 0 && (
                  <span className="absolute -top-1 -right-2 bg-strawberry text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {link.count}
                  </span>
                )}
              </div>
              <span className="mt-1 text-[11px] leading-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function UserHeader({
  userName,
  cartItemCount,
}: {
  userName?: string;
  cartItemCount?: number;
}) {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const effectiveCount = cartItemCount ?? totalItems;

  const links = [
    { href: "/catalog", label: "Catálogo", icon: Store },
    { href: "/cart", label: "Carrito", icon: ShoppingBag, count: effectiveCount },
    { href: "/orders", label: "Mis pedidos", icon: Package },
    { href: "/profile", label: "Perfil", icon: User },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-200/60 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-2">
            <span className="text-xl font-extrabold font-display text-ink tracking-tight">
              Rainbow Cake
            </span>
            <span className="bg-strawberry text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
              GO
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {links.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cotton text-strawberry font-semibold"
                    : "text-ink-secondary hover:text-ink hover:bg-meringue"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
                {link.count !== undefined && link.count > 0 && (
                  <span className="bg-strawberry text-white text-[10px] font-bold rounded-full px-1.5 py-0.2">
                    {link.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User name preview or mobile cart shortcut */}
        <div className="flex items-center gap-2">
          {userName && (
            <span className="text-xs font-medium text-ink-secondary hidden sm:inline">
              Hola, <span className="text-ink font-semibold">{userName}</span>
            </span>
          )}
          <Link
            href="/cart"
            className="sm:hidden relative p-2 rounded-xl text-ink-secondary hover:text-ink"
            aria-label="Ver carrito"
          >
            <ShoppingBag className="w-5 h-5 text-strawberry" />
            {effectiveCount > 0 && (
              <span className="absolute top-1 right-1 bg-strawberry text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {effectiveCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
