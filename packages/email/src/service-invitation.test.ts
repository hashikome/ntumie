import { describe, expect, it } from "bun:test";
import { expiryWhen, renderServiceInvitation } from "./service-invitation.js";

describe("service invitations", () => {
  it("renders both roles with an explicit acceptance link and expiry in both formats", async () => {
    for (const role of ["admin", "operator"] as const) {
      const url = "https://links.example/invitations/01922f61-6023-711c-819e-ddfa33a3c624";
      const mail = await renderServiceInvitation({
        role,
        invitationUrl: url,
        expiresAt: new Date("2026-10-13T12:00:00Z"),
        supportUrl: "https://links.example/support",
        recipient: "reader@example.com",
      });
      expect(mail.subject).toContain(`ntumie. service ${role}`);
      expect(mail.html).toContain(url);
      expect(mail.text).toContain(url);
      expect(mail.text).toContain("explicitly accept");
      expect(mail.text).not.toContain("UTC");
      expect(mail.text).toMatch(/Expires on Tuesday, 13 October 2026 \(in \d+ days?\)\./);
      expect(mail.html).not.toContain("Pigfarm");
      // The plain-text footer reads in the HTML's order: who and why, then the sign-off.
      expect(mail.text.indexOf("Sent to reader@example.com")).toBeLessThan(mail.text.indexOf("© "));
      for (const body of [mail.html, mail.text]) {
        expect(body).toContain("https://links.example/support");
        expect(body).toContain("Shikome Technology Limited, Dar es Salaam, Tanzania.");
        expect(body).not.toContain("Good links belong together.");
      }
    }
  });
  it("states the expiry in the reader's timezone, or as a duration without one", () => {
    const expiresAt = new Date("2026-11-08T12:00:00Z");
    const now = new Date("2026-11-01T12:00:00Z");
    const local = expiryWhen(expiresAt, "Africa/Dar_es_Salaam", now);
    expect(local).toContain("8 November 2026");
    expect(local).toContain("15:00");
    expect(local).not.toContain("UTC");
    const countdown = "on Sunday, 8 November 2026 (in 7 days)";
    expect(expiryWhen(expiresAt, null, now)).toBe(countdown);
    expect(expiryWhen(expiresAt, "Not/AZone", now)).toBe(countdown);
    expect(expiryWhen(new Date("2026-11-01T18:00:00Z"), null, now)).toBe(
      "on Sunday, 1 November 2026 (in 1 day)",
    );
  });
  it("rejects credential-bearing and non-web links", async () => {
    for (const invitationUrl of [
      "javascript:alert(1)",
      "https://user:password@example.com/invitations/1",
    ])
      await expect(
        renderServiceInvitation({
          role: "admin",
          invitationUrl,
          expiresAt: new Date(),
          supportUrl: "https://links.example/support",
          recipient: "reader@example.com",
        }),
      ).rejects.toThrow();
  });
});
