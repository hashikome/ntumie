"use client";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef } from "react";

// Save a link's frame: a dialog over the page it was opened from (a
// full-height sheet on phones), or the /capture page itself. Closing the
// dialog goes back to that page.
export function SaveLinkFrame({
  dialog,
  cancel,
  children,
}: {
  dialog: boolean;
  cancel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!dialog || ref.current?.open) return;
    // Opened from the /capture page itself (its header button, or a refused
    // save), the page form is already there: load the page, not a second form.
    if (document.querySelector("section.save-link-panel"))
      window.location.replace(window.location.href);
    else ref.current?.showModal();
  }, [dialog]);
  const Heading = dialog ? "h2" : "h1";
  const heading = (
    <header className="save-link-heading">
      <Heading id="save-link-title">Save a link</Heading>
      <SaveLinkDismiss dialog={dialog} cancel={cancel} className="save-link-close" label="Close">
        <CloseIcon />
      </SaveLinkDismiss>
    </header>
  );
  if (!dialog)
    return (
      <section className="save-link-panel" aria-labelledby="save-link-title">
        {heading}
        {children}
      </section>
    );
  return (
    <dialog
      ref={ref}
      className="save-link-panel save-link-dialog"
      aria-labelledby="save-link-title"
      onCancel={(event) => {
        event.preventDefault();
        router.back();
      }}
    >
      <div className="save-link-grab" aria-hidden="true" />
      {heading}
      {children}
    </dialog>
  );
}

// Close and Cancel: in the dialog they go back to the page underneath; on the
// /capture page they lead to where the person came from.
export function SaveLinkDismiss({
  dialog,
  cancel,
  className,
  label,
  children,
}: {
  dialog: boolean;
  cancel: string;
  className: string;
  label?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return dialog ? (
    <button type="button" className={className} aria-label={label} onClick={() => router.back()}>
      {children}
    </button>
  ) : (
    <a className={className} aria-label={label} href={cancel}>
      {children}
    </a>
  );
}

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);
