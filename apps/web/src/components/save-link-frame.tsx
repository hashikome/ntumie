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
    if (dialog && !ref.current?.open) ref.current?.showModal();
  }, [dialog]);
  const close = <CloseIcon />;
  const heading = (
    <header className="save-link-heading">
      {dialog ? (
        <h2 id="save-link-title">Save a link</h2>
      ) : (
        <h1 id="save-link-title">Save a link</h1>
      )}
      {dialog ? (
        <button
          type="button"
          className="save-link-close"
          aria-label="Close"
          onClick={() => router.back()}
        >
          {close}
        </button>
      ) : (
        <a className="save-link-close" aria-label="Close" href={cancel}>
          {close}
        </a>
      )}
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
