import type { LoginField } from "./fields.js";
import type { MailCredentials } from "../smtp/types.js";
import {
  ICLOUD_IMAP_HOST,
  ICLOUD_IMAP_PORT,
  ICLOUD_SMTP_HOST,
  ICLOUD_SMTP_PORT,
  icloudLocalPart
} from "../smtp/icloud.js";

export function loginFields(): readonly LoginField[] {
  return [
    {
      name: "email",
      label: "iCloud Mail address",
      type: "text",
      required: true,
      secret: false,
      envFallback: "ICLOUD_EMAIL",
      prompt: "if-missing",
      autocomplete: "username",
      placeholder: "you@icloud.com",
      help: "Full iCloud Mail address (@icloud.com, @me.com, @mac.com, or an iCloud custom domain)."
    },
    {
      name: "appPassword",
      label: "App-specific password",
      type: "password",
      required: true,
      secret: true,
      envFallback: "ICLOUD_APP_PASSWORD",
      prompt: "if-missing",
      autocomplete: "current-password",
      placeholder: "xxxx-xxxx-xxxx-xxxx",
      help: "Create an app-specific password in your Apple Account security settings. Your regular account password will not work.",
    },
    {
      name: "fromAddress",
      section: "Sender alias",
      label: "From address",
      type: "text",
      required: false,
      secret: false,
      envFallback: "ICLOUD_FROM",
      prompt: "if-missing",
      autocomplete: "email",
      placeholder: "you@icloud.com",
      help: "Leave empty to send from your iCloud address, or enter an alias belonging to this account.",
    }
  ];
}

export interface MailEnv {
  readonly email?: string | undefined;
  readonly appPassword?: string | undefined;
  readonly fromAddress?: string | undefined;
}

export function credentialsFromBag(
  bag: {
    readonly secrets: Readonly<Record<string, string>>;
    readonly claims?: Readonly<Record<string, string>>;
  },
  env: MailEnv = {}
): MailCredentials | undefined {
  const claims = bag.claims ?? {};
  const email = (claims.email ?? env.email ?? "").trim().toLowerCase();
  const password = bag.secrets.appPassword ?? env.appPassword ?? "";
  if (!email.includes("@") || password.length === 0) return undefined;
  const fromRaw = (claims.fromAddress ?? env.fromAddress ?? "").trim();
  return {
    host: ICLOUD_SMTP_HOST,
    port: ICLOUD_SMTP_PORT,
    security: "starttls",
    username: email,
    password,
    fromAddress: fromRaw || email,
    imapHost: ICLOUD_IMAP_HOST,
    imapPort: ICLOUD_IMAP_PORT,
    imapSecurity: "tls",
    imapUsername: icloudLocalPart(email)
  };
}
