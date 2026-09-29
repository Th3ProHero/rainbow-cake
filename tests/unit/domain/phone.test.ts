import { describe, it, expect } from "vitest";
import {
  validatePhone,
  normalizePhone,
  phoneForWhatsApp,
  formatPhone,
} from "@/lib/domain/phone";

describe("Phone Domain Logic", () => {
  it("validates and normalizes valid Mexican mobile numbers", () => {
    const raw = "5512345678";
    expect(validatePhone(raw, "MX")).toBe(true);
    expect(normalizePhone(raw, "MX")).toBe("+525512345678");
  });

  it("validates and normalizes numbers with country code included", () => {
    const raw = "+52 55 1234 5678";
    expect(validatePhone(raw)).toBe(true);
    expect(normalizePhone(raw)).toBe("+525512345678");
  });

  it("rejects invalid numbers", () => {
    expect(validatePhone("123", "MX")).toBe(false);
    expect(normalizePhone("123", "MX")).toBeNull();
    expect(validatePhone("abc", "MX")).toBe(false);
  });

  it("formats phone for WhatsApp link with digits only", () => {
    expect(phoneForWhatsApp("+52 55 1234 5678")).toBe("525512345678");
  });

  it("formats national phone for display", () => {
    const formatted = formatPhone("+525512345678");
    expect(formatted).toContain("55");
  });
});
