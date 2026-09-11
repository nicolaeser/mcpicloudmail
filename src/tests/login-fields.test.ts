import { describe, expect, it } from "vitest";
import { collectLoginBag } from "../auth/fields.js";
import { credentialsFromBag, loginFields } from "../auth/login-fields.js";
import { isAllowedRedirect } from "../auth/redirects.js";
import { readRuntimeConfig } from "../config.js";
import { ICLOUD_IMAP_HOST, ICLOUD_SMTP_HOST } from "../smtp/icloud.js";

describe("iCloud login fields", () => {
  it("collects email and app-specific password and fills Apple mail hosts", () => {
    const names = loginFields().map((field) => field.name);
    expect(names).toEqual(["email", "appPassword", "fromAddress"]);
    expect(loginFields().find((field) => field.name === "email")?.secret).toBe(false);
    expect(loginFields().find((field) => field.name === "appPassword")?.secret).toBe(true);
    const result = collectLoginBag(
      loginFields(),
      {
        email: " Mail-User@iCloud.com ",
        appPassword: " abcd-efgh-ijkl-mnop "
      },
      {}
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.bag.secrets.appPassword).toBe("abcd-efgh-ijkl-mnop");
    expect(result.bag.claims.email).toBe("Mail-User@iCloud.com");
    expect(credentialsFromBag(result.bag, {})).toEqual({
      host: ICLOUD_SMTP_HOST,
      port: 587,
      security: "starttls",
      username: "mail-user@icloud.com",
      password: "abcd-efgh-ijkl-mnop",
      fromAddress: "mail-user@icloud.com",
      imapHost: ICLOUD_IMAP_HOST,
      imapPort: 993,
      imapSecurity: "tls",
      imapUsername: "mail-user"
    });
  });

  it("fills from ICLOUD_EMAIL and ICLOUD_APP_PASSWORD when the form is empty", () => {
    const result = collectLoginBag(
      loginFields(),
      {},
      {
        ICLOUD_EMAIL: "env-user@icloud.com",
        ICLOUD_APP_PASSWORD: "xxxx-yyyy-zzzz-wwww",
        ICLOUD_FROM: "alias@icloud.com"
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(credentialsFromBag(result.bag, {})).toMatchObject({
      username: "env-user@icloud.com",
      fromAddress: "alias@icloud.com",
      host: ICLOUD_SMTP_HOST,
      imapHost: ICLOUD_IMAP_HOST
    });
  });

  it("reads ICLOUD_* in runtime config", () => {
    const config = readRuntimeConfig({
      ICLOUD_EMAIL: "alias-user@icloud.com",
      ICLOUD_APP_PASSWORD: "alias-pass",
      MCPICLOUDMAIL_PORT: "4000"
    });
    expect(config.email).toBe("alias-user@icloud.com");
    expect(config.password).toBe("alias-pass");
    expect(config.http.port).toBe(4000);
  });
});

describe("redirect allowlist", () => {
  it("allows Grok, Cursor loopback, and the Cursor native callback", () => {
    expect(isAllowedRedirect("https://grok.com/connectors-oauth-exchange-code/")).toBe(true);
    expect(isAllowedRedirect("http://localhost:8787/callback")).toBe(true);
    expect(isAllowedRedirect("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(true);
    expect(isAllowedRedirect("cursor://evil.example/oauth/callback")).toBe(false);
  });
});
