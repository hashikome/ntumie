"use client";
import { useEffect } from "react";

// Focus rings are for keyboard navigation. After a pointer press (mouse or
// touch) the page records pointer mode on <html>, which hides control rings.
// Any other way focus moves (the keyboard, assistive technology or a script,
// such as a dialog focusing its field) leaves pointer mode so rings return.
// Returning to the window re-focuses the element it left, with no press: that
// is not a move, so Chromium's redrawn ring stays hidden.
// Nothing is blurred, and text fields keep their own focused border.
const navigationKeys = new Set(["Tab", "F6", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export function FocusMode() {
  useEffect(() => {
    const root = document.documentElement;
    // A press focuses its target later in the same task; the flag lasts until the next one.
    let pressing = false;
    let leftWindowOn: Element | null = null;
    const pointer = () => {
      root.dataset.focusInput = "pointer";
      pressing = true;
      setTimeout(() => {
        pressing = false;
      });
    };
    const keyboard = (event: KeyboardEvent) => {
      if (navigationKeys.has(event.key)) delete root.dataset.focusInput;
    };
    const focusin = (event: FocusEvent) => {
      const returning = event.target === leftWindowOn;
      leftWindowOn = null;
      if (!pressing && !returning) delete root.dataset.focusInput;
    };
    const leave = () => {
      leftWindowOn = document.activeElement;
    };
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", keyboard, true);
    document.addEventListener("focusin", focusin, true);
    window.addEventListener("blur", leave);
    return () => {
      document.removeEventListener("pointerdown", pointer, true);
      document.removeEventListener("keydown", keyboard, true);
      document.removeEventListener("focusin", focusin, true);
      window.removeEventListener("blur", leave);
    };
  }, []);
  return null;
}
