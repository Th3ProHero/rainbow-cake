import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "rcg_session";

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-in-production-32chars!!";
  return new TextEncoder().encode(secret);
}

interface TokenPayload {
  userId: string;
  role: "USER" | "ADMIN";
  mustChangePassword: boolean;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });
    return {
      userId: payload.userId as string,
      role: payload.role as "USER" | "ADMIN",
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;

  // 1. Mandatory password change check
  if (session?.mustChangePassword) {
    if (
      !pathname.startsWith("/change-password") &&
      !pathname.startsWith("/api/auth/logout") &&
      !pathname.startsWith("/_next") &&
      pathname !== "/favicon.ico"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  // 2. Admin routes protection
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== "ADMIN") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // 3. User protected routes
  const protectedUserPrefixes = ["/orders", "/profile"];
  const isProtectedUser = protectedUserPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtectedUser && !session) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // 4. Guest-only routes (redirect if already logged in)
  if (session && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = session.role === "ADMIN" ? "/admin" : "/catalog";
    return NextResponse.redirect(url);
  }

  // 5. Add security headers
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icons, manifest
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/).*)",
  ],
};
