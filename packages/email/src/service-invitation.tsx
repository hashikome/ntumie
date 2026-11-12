import { Button, render, Text } from "@react-email/components";
import { companyLine, EmailLayout, type RenderedEmail } from "./code-email.js";

const text = { fontSize: "16px", lineHeight: "24px", margin: "16px 0 0" };
const small = { fontSize: "14px", lineHeight: "21px", margin: "12px 0 0" };

const day = { weekday: "long", day: "numeric", month: "long", year: "numeric" } as const;

// The date and time in the reader's own timezone when their account has one.
// Otherwise (a new person, or Automatic, which only their device knows) the date
// with a countdown, which stays right wherever they are. Readers never get UTC.
export function expiryWhen(expiresAt: Date, timeZone?: string | null, now = new Date()) {
  if (timeZone) {
    try {
      const when = new Intl.DateTimeFormat("en-GB", {
        ...day,
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(expiresAt);
      return `on ${when}`;
    } catch {
      // A stored timezone this runtime doesn't know falls through to the countdown.
    }
  }
  const date = new Intl.DateTimeFormat("en-GB", { ...day, timeZone: "UTC" }).format(expiresAt);
  const days = Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000));
  return `on ${date} (in ${days === 1 ? "1 day" : `${days} days`})`;
}

export async function renderServiceInvitation(input: {
  role: "admin" | "operator";
  invitationUrl: string;
  expiresAt: Date;
  supportUrl: string;
  recipient: string;
  /** The reader's saved timezone, when they have an account with one. */
  timeZone?: string | null;
}): Promise<RenderedEmail> {
  const url = new URL(input.invitationUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Invalid invitation URL");
  const role = input.role === "admin" ? "service admin" : "service operator";
  const expiry = expiryWhen(input.expiresAt, input.timeZone);
  const subject = `You're invited to be a ntumie. ${role}`;
  const html = await render(
    <EmailLayout
      lang="en"
      preview={subject}
      footer={{
        recipient: input.recipient,
        reason: `because you were invited to be a ntumie. ${role}.`,
        supportUrl: input.supportUrl,
        prompt: "Not expecting this invitation? You can ignore it; nothing changes.",
      }}
    >
      <Text style={{ fontSize: "20px", lineHeight: "28px", fontWeight: 700, margin: "28px 0 0" }}>
        You have been invited to be a {role}.
      </Text>
      <Text style={text}>
        Review the invitation and accept if you want this role. If you are new, enter your name to
        create your account. Everyone must then verify a fresh email code before the role becomes
        active, including people who are already signed in. Opening this email or its link does not
        give you access.
      </Text>
      <Button
        href={url.href}
        style={{
          backgroundColor: "#1e3fbf",
          color: "#ffffff",
          borderRadius: "999px",
          padding: "12px 22px",
          marginTop: "24px",
          fontSize: "16px",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Review invitation
      </Button>
      <Text style={{ ...small, marginTop: "24px" }}>
        {`This invitation expires ${expiry}. You can decline it or ignore it.`}
      </Text>
      <Text style={small}>Sign in with the email address that received this invitation.</Text>
    </EmailLayout>,
  );
  return {
    subject,
    html,
    text: `${subject}\n\nOpen the invitation and explicitly accept if you want this role. New users enter their name to create an account. Everyone must then verify a fresh email code before the role becomes active, including people who are already signed in. Opening the link does not grant access.\n\n${url.href}\n\nExpires ${expiry}. You can decline or ignore this invitation. Sign in with the email that received it.\n\nSent to ${input.recipient} because you were invited to be a ntumie. ${role}.\nNot expecting this invitation? You can ignore it; nothing changes.\nNeed help? Visit ${input.supportUrl}. This address doesn't take replies.\n\nntumie.\n${companyLine()}`,
  };
}
