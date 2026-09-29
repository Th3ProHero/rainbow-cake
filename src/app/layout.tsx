import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import "./globals.css";

// Clean browser extension attributes in development
if (process.env.NODE_ENV === 'development') {
  import('@/lib/clean-extensions');
}

const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Rainbow Cake GO",
    template: "%s | Rainbow Cake GO",
  },
  description: "Control de ventas y pedidos de merch — Rainbow Cake GO",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rainbow Cake GO",
  },
};

export const viewport: Viewport = {
  themeColor: "#D12F6A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

import { CartProvider } from "@/hooks/use-cart";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${bricolageGrotesque.variable} ${figtree.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body 
        className="font-body antialiased bg-meringue text-ink min-h-dvh"
        suppressHydrationWarning
      >
        <CartProvider>{children}</CartProvider>
        
        {/* Inline script to suppress hydration warnings from browser extensions */}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const originalError = console.error;
                  const originalWarn = console.warn;
                  
                  console.error = function(...args) {
                    const msg = args[0];
                    if (typeof msg === 'string' && (
                      msg.includes('Hydration') ||
                      msg.includes('hydrated') ||
                      msg.includes('bis_skin_checked') ||
                      msg.includes('bis_register') ||
                      msg.includes('__processed_') ||
                      msg.includes('server rendered HTML')
                    )) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
                  
                  console.warn = function(...args) {
                    const msg = args[0];
                    if (typeof msg === 'string' && (
                      msg.includes('Hydration') ||
                      msg.includes('bis_skin_checked')
                    )) {
                      return;
                    }
                    originalWarn.apply(console, args);
                  };
                })();
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
