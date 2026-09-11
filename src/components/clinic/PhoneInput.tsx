import { useState } from "react";
import { inputClass } from "@/components/clinic/bits";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { phoneError } from "@/data/clinic";
import { COUNTRIES, DEFAULT_COUNTRY, splitDefault } from "@/data/countries";

interface PhoneInputProps {
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  className?: string;
}

export function PhoneInput({ name, defaultValue, required, className }: PhoneInputProps) {
  const initial = splitDefault(defaultValue ?? "");
  const [countryIso, setCountryIso] = useState(initial.iso);
  const [value, setValue] = useState(initial.value);

  const currentCountry = COUNTRIES.find((c) => c.iso === countryIso) ?? DEFAULT_COUNTRY;
  const error = phoneError(value, currentCountry.code);

  return (
    <div className={className}>
      <input type="hidden" name={`${name}_country`} value={currentCountry.code} />
      <div className="flex gap-1.5">
        <Select value={countryIso} onValueChange={setCountryIso}>
          <SelectTrigger className="w-[4.75rem] shrink-0">
            <span>+{currentCountry.code}</span>
          </SelectTrigger>
          <SelectContent className="min-w-64 max-h-72">
            {COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>
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
          placeholder={currentCountry.code === "91" ? "10-digit mobile number" : "Mobile number"}
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
