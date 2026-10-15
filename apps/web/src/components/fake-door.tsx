import type { InterestFeature } from "@ntumie/types";
import type { ReactNode } from "react";
import { NativeForm } from "./native-form";

// A designed control whose feature is on the way. Using it records interest
// (the backend keeps it for deciding what comes next) and returns to the page,
// which says the feature is coming: as a toast (`notice`) or, for a tab, in its
// own panel. Works without JavaScript.
export function FakeDoor({
  feature,
  returnTo,
  notice = true,
  className = "button",
  children,
  current,
  switchLabelledBy,
}: {
  feature: InterestFeature;
  returnTo: string;
  notice?: boolean;
  className?: string;
  children: ReactNode;
  current?: boolean;
  /** Render as an off switch named by this element (a setting on the way). */
  switchLabelledBy?: string;
}) {
  return (
    <NativeForm action="/forms/interest" className="fake-door">
      <input type="hidden" name="feature" value={feature} />
      <input type="hidden" name="returnTo" value={returnTo} />
      {notice && <input type="hidden" name="notice" value="1" />}
      <button
        type="submit"
        className={className}
        aria-current={current ? "page" : undefined}
        {...(switchLabelledBy
          ? { role: "switch", "aria-checked": false, "aria-labelledby": switchLabelledBy }
          : {})}
      >
        {children}
      </button>
    </NativeForm>
  );
}
