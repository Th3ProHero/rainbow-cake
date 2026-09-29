/**
 * Domain logic for phone number validation and normalization.
 * Pure functions — uses libphonenumber-js.
 */

import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

/**
 * Validate a phone number.
 * Returns true if the number is valid for the given country.
 */
export function validatePhone(
  phone: string,
  defaultCountry: CountryCode = (process.env.DEFAULT_PHONE_COUNTRY as CountryCode) || "MX"
): boolean {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);
    return parsed?.isValid() ?? false;
  } catch {
    return false;
  }
}

/**
 * Normalize a phone number to E.164 format.
 * Returns null if the number is invalid.
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = (process.env.DEFAULT_PHONE_COUNTRY as CountryCode) || "MX"
): string | null {
  try {
    const parsed = parsePhoneNumberFromString(phone, defaultCountry);
    if (!parsed?.isValid()) return null;
    return parsed.format("E.164");
  } catch {
    return null;
  }
}

/**
 * Format a phone number for display (national format).
 */
export function formatPhone(phone: string): string {
  try {
    const parsed = parsePhoneNumberFromString(phone);
    if (!parsed) return phone;
    return parsed.formatNational();
  } catch {
    return phone;
  }
}

/**
 * Strip phone number to digits only with country code (for WhatsApp links).
 * E.164 "+5215512345678" → "5215512345678"
 */
export function phoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "");
}
