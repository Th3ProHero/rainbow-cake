"use client";

import * as React from "react";
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";
import { cn } from "@/lib/utils";
import { Check, AlertCircle } from "lucide-react";

const POPULAR_COUNTRIES: { code: CountryCode; label: string; dial: string; flag: string }[] = [
  { code: "MX", label: "México", dial: "+52", flag: "🇲🇽" },
  { code: "US", label: "Estados Unidos", dial: "+1", flag: "🇺🇸" },
  { code: "CO", label: "Colombia", dial: "+57", flag: "🇨🇴" },
  { code: "AR", label: "Argentina", dial: "+54", flag: "🇦🇷" },
  { code: "CL", label: "Chile", dial: "+56", flag: "🇨🇱" },
  { code: "PE", label: "Perú", dial: "+51", flag: "🇵🇪" },
  { code: "ES", label: "España", dial: "+34", flag: "🇪🇸" },
  { code: "GT", label: "Guatemala", dial: "+502", flag: "🇬🇹" },
  { code: "CR", label: "Costa Rica", dial: "+506", flag: "🇨🇷" },
  { code: "EC", label: "Ecuador", dial: "+593", flag: "🇪🇨" },
];

interface PhoneInputProps {
  id?: string;
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e164: string, isValid: boolean) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function PhoneInput({
  id = "phone-input",
  name = "whatsapp",
  defaultValue = "",
  value,
  onChange,
  required = true,
  disabled = false,
  className,
  error,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = React.useState<CountryCode>("MX");
  const [localNumber, setLocalNumber] = React.useState("");
  const [normalizedE164, setNormalizedE164] = React.useState("");
  const [isValid, setIsValid] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  // Initialize from defaultValue or value
  React.useEffect(() => {
    const initial = value !== undefined ? value : defaultValue;
    if (initial) {
      try {
        const parsed = parsePhoneNumberFromString(initial);
        if (parsed) {
          if (parsed.country) setSelectedCountry(parsed.country);
          setLocalNumber(parsed.formatNational());
          setNormalizedE164(parsed.format("E.164"));
          setIsValid(parsed.isValid());
          return;
        }
      } catch {
        // Fall back to raw
      }
      setLocalNumber(initial);
    }
  }, [defaultValue, value]);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const country = e.target.value as CountryCode;
    setSelectedCountry(country);
    validateAndUpdate(localNumber, country);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalNumber(raw);
    setTouched(true);
    validateAndUpdate(raw, selectedCountry);
  };

  const validateAndUpdate = (num: string, country: CountryCode) => {
    try {
      const parsed = parsePhoneNumberFromString(num, country);
      if (parsed && parsed.isValid()) {
        const e164 = parsed.format("E.164");
        setNormalizedE164(e164);
        setIsValid(true);
        onChange?.(e164, true);
        return;
      }
    } catch {
      // invalid
    }
    setNormalizedE164("");
    setIsValid(false);
    onChange?.("", false);
  };

  const currentCountryObj =
    POPULAR_COUNTRIES.find((c) => c.code === selectedCountry) || POPULAR_COUNTRIES[0];

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="relative flex rounded-xl border border-pink-200/80 bg-white shadow-xs focus-within:border-strawberry focus-within:ring-2 focus-within:ring-strawberry/20 transition-all">
        {/* Country selector */}
        <div className="relative flex items-center pl-3 pr-2 border-r border-pink-200/60 bg-meringue/40 rounded-l-xl">
          <span className="text-lg mr-1.5 select-none">{currentCountryObj.flag}</span>
          <span className="text-sm font-medium text-ink/80 mr-1 select-none">
            {currentCountryObj.dial}
          </span>
          <select
            value={selectedCountry}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Seleccionar país de teléfono"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {POPULAR_COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.label} ({c.dial})
              </option>
            ))}
          </select>
        </div>

        {/* Number input */}
        <input
          id={id}
          type="tel"
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={() => setTouched(true)}
          placeholder="Ej. 55 1234 5678"
          disabled={disabled}
          required={required}
          className="flex-1 min-w-0 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink/40 bg-transparent outline-hidden rounded-r-xl"
        />

        {/* Status indicator */}
        <div className="flex items-center pr-3 pointer-events-none">
          {touched && localNumber.length > 3 && (
            isValid ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )
          )}
        </div>
      </div>

      {/* Hidden input submitting the normalized E.164 string to form actions */}
      <input type="hidden" name={name} value={normalizedE164} />

      {/* Error or hint message */}
      {error ? (
        <p className="text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      ) : touched && localNumber.length > 3 && !isValid ? (
        <p className="text-xs text-rose-600 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Ingresa un número de WhatsApp válido (con lada de tu ciudad)
        </p>
      ) : null}
    </div>
  );
}
