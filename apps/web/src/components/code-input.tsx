"use client";
import { useEffect, useRef, useState } from "react";

// The six-digit code as six boxes. It stays one real input (so pasting
// "336 865", autofill and screen readers just work); the boxes only show its
// digits. Without JavaScript it is a plain field.
export function CodeInput({ invalid = false }: { invalid?: boolean }) {
  const [enhanced, setEnhanced] = useState(false);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValue(field.current?.value ?? "");
    setEnhanced(true);
  }, []);
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return (
    <div className={`code-input${enhanced ? " is-enhanced" : ""}${invalid ? " is-invalid" : ""}`}>
      <input
        ref={field}
        id="code"
        name="code"
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9\s\-]{6,16}"
        maxLength={16}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "code-error" : undefined}
        onChange={(event) => setValue(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {enhanced && (
        <div className="code-boxes" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: Six fixed positions.
              key={index}
              className={focused && index === Math.min(digits.length, 5) ? "is-current" : undefined}
            >
              {digits[index] ?? ""}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
