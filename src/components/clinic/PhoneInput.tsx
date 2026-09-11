import { useState } from "react";
import { inputClass } from "@/components/clinic/bits";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { phoneError } from "@/data/clinic";

const COUNTRIES = [
  { code: "91", label: "India", flag: "+91" },
  { code: "1", label: "United States", flag: "+1" },
  { code: "44", label: "United Kingdom", flag: "+44" },
  { code: "977", label: "Nepal", flag: "+977" },
];

function splitDefault(val: string | null | undefined): { code: string; value: string } {
  if (!val) return { code: "91", value: "" };
  const s = String(val).trim();
  const digits = s.replace(/\D/g, "");
  if (s.startsWith("+") && digits.length > 10) {
    for (const c of COUNTRIES) {
      if (digits.startsWith(c.code)) return { code: c.code, value: digits.slice(c.code.length) };
    }
  }
  return { code: "91", value: digits };
}

interface PhoneInputProps {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
}

export function PhoneInput({ name, defaultValue, required, className }: PhoneInputProps) {
  const initial = splitDefault(defaultValue ?? "");
  const [countryCode, setCountryCode] = useState(initial.code);
  const [value, setValue] = useState(initial.value);
  const error = phoneError(value);

  return (
    <div className={className}>
      <input type="hidden" name={`${name}_country`} value={countryCode} />
      <div className="flex gap-1.5">
        <Select value={countryCode} onValueChange={setCountryCode}>
          <SelectTrigger className="w-[4.25rem] shrink-0">
            <span>+{countryCode}</span>
          </SelectTrigger>
          <SelectContent className="min-w-48">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="font-medium">{c.flag}</span>
                <span className="ml-2">{c.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          name={name}
          type="text"
          inputMode="tel"
          placeholder="10-digit mobile number"
          className={inputClass}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required={required}
        />
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
