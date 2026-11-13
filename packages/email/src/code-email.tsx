import { Body, Container, Head, Hr, Html, Preview, render, Text } from "@react-email/components";
import type { ReactNode } from "react";

// Codes-only authentication mail. Navigation links never carry proof.

export interface CodeEmailBaseInput {
  /** Supported locales; copy ships English-first. */
  locale: "en";
  /** The one-time code better-auth minted. */
  code: string;
  /** Support route for unexpected-message recovery (https). */
  supportUrl: string;
  /** Who this is sent to, named in the footer so a reader can see why they have it. */
  recipient: string;
  /** Validity window better-auth decided, in minutes (1–60). */
  expiresInMinutes: number;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const SUPPORTED_LOCALES = ["en"];
const CODE_RE = /^[0-9]{4,10}$/;

export function assertValidBaseInput(input: CodeEmailBaseInput): string[] {
  const errors: string[] = [];
  if (!SUPPORTED_LOCALES.includes(input.locale)) {
    errors.push(`unsupported locale "${input.locale}"`);
  }
  if (!CODE_RE.test(input.code)) {
    errors.push("code must be 4-10 digits");
  }
  if (!/^[^\s@]+@[^\s@]+$/.test(input.recipient)) {
    errors.push("recipient must be an email address");
  }
  for (const [name, url] of [["supportUrl", input.supportUrl]] as const) {
    if (!/^https:\/\//.test(url)) {
      errors.push(`${name} must be an https:// URL`);
    }
  }
  if (
    !Number.isInteger(input.expiresInMinutes) ||
    input.expiresInMinutes < 1 ||
    input.expiresInMinutes > 60
  ) {
    errors.push("expiresInMinutes must be an integer between 1 and 60");
  }
  return errors;
}

export function expiryPhrase(expiresInMinutes: number): string {
  return expiresInMinutes === 1 ? "1 minute" : `${expiresInMinutes} minutes`;
}

// No background or text colour anywhere: the reader's mail app supplies them,
// so the email follows its light or dark theme. Secondary text is marked by
// size, because a fixed grey fails on one theme or the other.
const styles = {
  body: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: "16px",
    lineHeight: "24px",
    margin: 0,
  },
  container: { maxWidth: "560px", margin: "0 auto", padding: "32px 24px" },
  wordmark: {
    fontSize: "22px",
    lineHeight: "28px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: 0,
  },
  lead: { fontSize: "16px", lineHeight: "24px", margin: "28px 0 0" },
  code: {
    fontSize: "32px",
    lineHeight: "40px",
    fontWeight: 700,
    letterSpacing: "0.35em",
    margin: "24px 0 0",
  },
  validity: { fontSize: "16px", lineHeight: "24px", margin: "24px 0 0" },
  note: { fontSize: "14px", lineHeight: "21px", margin: "16px 0 0" },
  warning: { fontSize: "15px", lineHeight: "23px", fontWeight: 700, margin: "28px 0 0" },
} as const;

const footerStyles = {
  hr: { border: 0, borderTop: "1px solid #8884", margin: "40px 0 20px" },
  small: { fontSize: "13px", lineHeight: "20px", margin: "0 0 8px" },
  wordmark: {
    fontSize: "15px",
    lineHeight: "20px",
    fontWeight: 700,
    letterSpacing: "-0.02em",
    margin: "16px 0 0",
  },
  closing: { fontSize: "13px", lineHeight: "20px", margin: "4px 0 0" },
} as const;

// One layout for every email: the wordmark, the message, then the footer.
export function EmailLayout({
  lang,
  preview,
  children,
  footer,
}: {
  lang: string;
  preview: string;
  children: ReactNode;
  footer: EmailFooterProps;
}) {
  return (
    <Html lang={lang}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>ntumie.</Text>
          {children}
          <EmailFooter {...footer} />
        </Container>
      </Body>
    </Html>
  );
}

// The sign-off under the wordmark: the company, never the product (workspace brand/email.md).
export function companyLine(): string {
  return `© ${new Date().getUTCFullYear()} Shikome Technology Limited, Dar es Salaam, Tanzania.`;
}

export interface EmailFooterProps {
  recipient: string;
  /** Why this reached them, finishing "Sent to <recipient> ...". */
  reason: string;
  supportUrl: string;
  /** What to do if they didn't expect it. */
  prompt?: string;
}

// A link shows its full address, never a label alone, so a reader can type it on
// another device (workspace brand/email.md).
// The product's own address, under its wordmark: the support page is on the web
// app, so its origin is the product's site.
export function productSite(supportUrl: string): string {
  return new URL(supportUrl).origin;
}

export function supportLine(supportUrl: string): string {
  return `Need help? Visit support ${supportUrl}. This address doesn't take replies.`;
}

// Why this came, what to do about it, then the name. Links stay plain so the
// mail app colours them for its theme.
export function EmailFooter({
  recipient,
  reason,
  supportUrl,
  prompt = "Didn't request this? You can safely ignore this email.",
}: EmailFooterProps) {
  return (
    <>
      <Hr style={footerStyles.hr} />
      <Text style={footerStyles.small}>{`Sent to ${recipient} ${reason}`}</Text>
      <Text style={footerStyles.small}>{prompt}</Text>
      <Text style={footerStyles.small}>
        Need help? Visit support <a href={supportUrl}>{supportUrl}</a>. This address doesn't take
        replies.
      </Text>
      <Text style={footerStyles.wordmark}>ntumie.</Text>
      <Text style={footerStyles.closing}>
        <a href={productSite(supportUrl)}>{productSite(supportUrl)}</a>
      </Text>
      <Text style={footerStyles.closing}>{companyLine()}</Text>
    </>
  );
}

export interface CodeEmailCopy {
  /** Inbox preview line; never contains the code. */
  preview: string;
  /** The sentence introducing the code. */
  lead: string;
  /** Optional muted reassurance line, e.g. "ignore this and nothing changes". */
  note?: string;
}

export function CodeEmail({ input, copy }: { input: CodeEmailBaseInput; copy: CodeEmailCopy }) {
  return (
    <EmailLayout
      lang={input.locale}
      preview={copy.preview}
      footer={{
        recipient: input.recipient,
        reason: "because this code was requested for ntumie.",
        supportUrl: input.supportUrl,
      }}
    >
      <Text style={styles.lead}>{copy.lead}</Text>
      <Text style={styles.code}>{input.code}</Text>
      <Text style={styles.validity}>
        This code is only valid for the next {expiryPhrase(input.expiresInMinutes)}. Enter it in the
        app to continue.
      </Text>
      {copy.note ? <Text style={styles.note}>{copy.note}</Text> : null}
      <Text style={styles.warning}>Do not share this code with anyone.</Text>
    </EmailLayout>
  );
}

export async function renderCodeEmail(
  subject: string,
  input: CodeEmailBaseInput,
  copy: CodeEmailCopy,
): Promise<RenderedEmail> {
  const element = <CodeEmail input={input} copy={copy} />;
  return {
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  };
}
