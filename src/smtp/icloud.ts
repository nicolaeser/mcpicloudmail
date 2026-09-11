import type { MailCredentials } from "./types.js";

export const ICLOUD_SMTP_HOST = "smtp.mail.me.com";
export const ICLOUD_SMTP_PORT = 587;
export const ICLOUD_IMAP_HOST = "imap.mail.me.com";
export const ICLOUD_IMAP_PORT = 993;

export function icloudLocalPart(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function pushUser(users: string[], value: string | undefined): void {
  const user = (value ?? "").trim();
  if (user.length > 0 && !users.includes(user)) users.push(user);
}

export function imapAuthUsers(credentials: MailCredentials): string[] {
  const users: string[] = [];
  pushUser(users, credentials.imapUsername);
  pushUser(users, credentials.username);
  return users;
}

export function smtpAuthUsers(credentials: MailCredentials): string[] {
  const users: string[] = [];
  pushUser(users, credentials.username);
  pushUser(users, credentials.imapUsername);
  return users;
}
