import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSafeFilePath } from "@/lib/files";

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await context.params;
  const relativePath = pathSegments.join("/");

  // Verify path is safe
  const absolutePath = getSafeFilePath(relativePath);
  if (!absolutePath) {
    return new NextResponse("Acceso no autorizado", { status: 403 });
  }

  // Check file existence
  let stat;
  try {
    stat = await fs.stat(absolutePath);
  } catch {
    return new NextResponse("Archivo no encontrado", { status: 404 });
  }

  // Authorization check
  const isPaymentReceipt = relativePath.startsWith("payments/");

  if (isPaymentReceipt) {
    const session = await getSession();
    if (!session) {
      return new NextResponse("Inicia sesión para ver este comprobante", {
        status: 401,
      });
    }

    // Admins can see all payments; regular users can only see their own
    if (session.role !== "ADMIN") {
      const payment = await prisma.payment.findFirst({
        where: {
          filePath: relativePath,
          userId: session.userId,
        },
      });

      if (!payment) {
        return new NextResponse("No tienes permiso para ver este comprobante", {
          status: 403,
        });
      }
    }
  }

  // Determine content type
  const ext = relativePath.split(".").pop()?.toLowerCase() || "";
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  try {
    const fileBuffer = await fs.readFile(absolutePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": stat.size.toString(),
        "Cache-Control": isPaymentReceipt
          ? "private, no-cache, no-store, must-revalidate"
          : "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("Error al servir archivo:", err);
    return new NextResponse("Error al leer archivo", { status: 500 });
  }
}
