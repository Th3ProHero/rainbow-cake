import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";
import type { SessionPayload } from "@/types";

const COOKIE_NAME = "rcg_session";
const SESSION_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-secret-change-in-production-32chars!!";
  return new TextEncoder().encode(secret);
}

/**
 * Determine if we should use secure cookies.
 * Only use secure if we're in production AND APP_URL uses https.
 */
function shouldUseSecureCookies(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }
  const appUrl = process.env.APP_URL || "";
  return appUrl.startsWith("https://");
}

/**
 * Hash a plaintext password with bcrypt (cost 12).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a plaintext password against a bcrypt hash.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Sign a JWT token with user payload.
 */
export async function signToken(
  payload: Omit<SessionPayload, "exp">
): Promise<string> {
  const key = getSecretKey();
  const exp = Math.floor(Date.now() / 1000) + SESSION_DURATION;

  return new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(key);
}

/**
 * Verify and decode a JWT token string.
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
    });

    return {
      userId: payload.userId as string,
      role: payload.role as Role,
      mustChangePassword: Boolean(payload.mustChangePassword),
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

/**
 * Create a session and set the httpOnly cookie.
 */
export async function createSession(
  userId: string,
  role: Role,
  mustChangePassword: boolean
): Promise<void> {
  const token = await signToken({ userId, role, mustChangePassword });
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

/**
 * Read and verify session from request cookies.
 */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Destroy the session cookie.
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch {
    // Cookie store might be unavailable
  }
}

/**
 * Get current authenticated user from database.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      whatsapp: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) return null;
  return user;
}
