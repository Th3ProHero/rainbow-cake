import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileTypeFromBuffer } from "file-type";

const UPLOAD_BASE_DIR = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || "./uploads"
);

const MAX_UPLOAD_BYTES =
  (parseInt(process.env.MAX_UPLOAD_MB || "10", 10) || 10) * 1024 * 1024;

export const ALLOWED_IMAGE_MIMES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const ALLOWED_PAYMENT_MIMES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

export interface FileValidationResult {
  valid: boolean;
  mime?: string;
  ext?: string;
  error?: string;
}

/**
 * Validate file content using magic bytes.
 */
export async function validateFileContent(
  buffer: Buffer,
  allowedMimes: string[]
): Promise<FileValidationResult> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    const mb = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `El archivo excede el tamaño máximo permitido (${mb} MB).`,
    };
  }

  // Detect MIME type by magic bytes
  const typeResult = await fileTypeFromBuffer(buffer);

  if (!typeResult) {
    return {
      valid: false,
      error: "No se pudo determinar el formato real del archivo o está corrupto.",
    };
  }

  if (!allowedMimes.includes(typeResult.mime)) {
    return {
      valid: false,
      error: `Formato de archivo no permitido (${typeResult.mime}). Formatos aceptados: ${allowedMimes.join(", ")}.`,
    };
  }

  return {
    valid: true,
    mime: typeResult.mime,
    ext: typeResult.ext,
  };
}

/**
 * Save an uploaded file securely to disk.
 *
 * @param buffer file content buffer
 * @param folder 'products' or 'payments'
 * @param ext detected extension (e.g. 'jpg', 'png', 'webp', 'pdf')
 * @returns relative path to store in DB (e.g. 'products/abc-123.jpg')
 */
export async function saveUploadedFile(
  buffer: Buffer,
  folder: "products" | "payments" | "returns",
  ext: string
): Promise<string> {
  const targetDir = path.join(UPLOAD_BASE_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  const filePath = path.join(targetDir, filename);

  await fs.writeFile(filePath, buffer);

  // Return relative path with forward slashes for database consistency
  return `${folder}/${filename}`;
}

/**
 * Resolve a stored relative path safely and ensure it does not escape UPLOAD_BASE_DIR.
 */
export function getSafeFilePath(relativePath: string): string | null {
  // Normalize and prevent path traversal
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(UPLOAD_BASE_DIR, normalized);

  if (!fullPath.startsWith(UPLOAD_BASE_DIR)) {
    return null; // Path traversal attempt
  }

  return fullPath;
}

/**
 * Delete a file if it exists.
 */
export async function deleteUploadedFile(relativePath?: string | null): Promise<void> {
  if (!relativePath) return;
  const fullPath = getSafeFilePath(relativePath);
  if (!fullPath) return;

  try {
    await fs.unlink(fullPath);
  } catch {
    // Ignore if file doesn't exist
  }
}
