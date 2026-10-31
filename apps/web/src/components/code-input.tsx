"use client";
import { useEffect, useRef, useState } from "react";

// The six-digit code as six boxes. It stays one real input (so pasting
// "336 865", autofill and screen readers just work); the boxes show exactly
// what will be sent. Without JavaScript it is a plain field.
export function CodeInput({ invalid = false }: { invalid?: boolean }) {
  const [enhanced, setEnhanced] = useState(false);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setValue(field.current?.value ?? "");
    setEnhanced(true);
  }, []);
  // A rejected code stays on screen only until the next try: the page is kept
  // across the failed attempt, so the field would otherwise keep its old digits.
  useEffect(() => {
    if (!invalid || !field.current) return;
    field.current.value = "";
    setValue("");
  }, [invalid]);
  // The newest six digits win, so the field can never hold more than the boxes
  // show: typing after an old code replaces it instead of landing out of sight.
  const change = (input: HTMLInputElement) => {
    const latest = input.value.replace(/\D/g, "").slice(-6);
    input.value = latest;
    setValue(latest);
  };
  const digits = value.replace(/\D/g, "").slice(-6);
  return (
    <div className={`code-input${enhanced ? " is-enhanced" : ""}${invalid ? " is-invalid" : ""}`}>
      <input
        ref={field}
        id="code"
        name="code"
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={16}
        required
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "code-error" : undefined}
        onChange={(event) => change(event.target)}
        onFocus={(event) => {
          setFocused(true);
          event.target.select();
        }}
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
