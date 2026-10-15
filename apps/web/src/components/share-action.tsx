import { type ShareTarget, sharePath } from "../lib/sharing";

export function ShareAction({
  target,
  returnTo,
  label = "Share",
  className = "button",
  icon = false,
}: {
  target: ShareTarget;
  returnTo: string;
  label?: string;
  className?: string;
  /** With an icon, narrow layouts may show the icon alone (the label stays for screen readers). */
  icon?: boolean;
}) {
  return (
    <a className={className} href={sharePath(target, returnTo)}>
      {icon && (
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
        </svg>
      )}
      <span className="share-label">{label}</span>
    </a>
  );
}
