import { describe, expect, it } from "vitest";
import { createNodemailerDriver, type SmtpTransportHandle } from "../smtp/drivers.js";
import { imapAuthUsers, smtpAuthUsers } from "../smtp/icloud.js";
import { MailAccountError } from "../smtp/types.js";
import { SECRET_FROM, SECRET_USERNAME, testCredentials } from "./helpers.js";

const RECIPIENT = "peer@example.com";
const LOCAL_PART = SECRET_USERNAME.slice(0, SECRET_USERNAME.indexOf("@"));

describe("iCloud auth usernames", () => {
  it("tries IMAP local-part first, then the full mailbox", () => {
    expect(imapAuthUsers(testCredentials())).toEqual([LOCAL_PART, SECRET_USERNAME]);
  });

  it("tries the full iCloud address first for SMTP, then the IMAP local-part", () => {
    expect(smtpAuthUsers(testCredentials())).toEqual([SECRET_USERNAME, LOCAL_PART]);
  });
});

describe("SMTP AUTH LOGIN", () => {
  it("sends AUTH LOGIN as the full iCloud address when sending to another mailbox", async () => {
    const attempts: string[] = [];
    const methods: unknown[] = [];
    const authMethods: unknown[] = [];
    const driver = createNodemailerDriver(testCredentials(), (options) => {
      methods.push(options.authMethod);
      const auth = options.auth;
      authMethods.push(
        auth !== null && typeof auth === "object" ? (auth as { method?: unknown }).method : undefined
      );
      return fakeTransport(attempts, options, () => false);
    });
    const result = await driver.send({
      to: [RECIPIENT],
      subject: "hello",
      text: "hello",
      from: SECRET_FROM
    });
    expect(attempts).toEqual([SECRET_USERNAME]);
    expect(methods).toEqual(["LOGIN"]);
    expect(authMethods).toEqual(["LOGIN"]);
    expect(result.messageId).toBe("<ok>");
  });

  it("retries SMTP AUTH with the IMAP local-part after the full address is rejected", async () => {
    const attempts: string[] = [];
    const driver = createNodemailerDriver(testCredentials(), (options) =>
      fakeTransport(attempts, options, (user) => user === SECRET_USERNAME)
    );
    const result = await driver.send({
      to: [RECIPIENT],
      subject: "hello",
      text: "hello",
      from: SECRET_FROM
    });
    expect(attempts).toEqual([SECRET_USERNAME, LOCAL_PART]);
    expect(result.messageId).toBe("<ok>");
  });

  it("does not retry a non-auth SMTP failure with another username", async () => {
    const attempts: string[] = [];
    const driver = createNodemailerDriver(testCredentials(), (options) => {
      attempts.push(transportUser(options));
      return {
        verify: async () => true,
        sendMail: async () => {
          throw Object.assign(new Error("connect ETIMEDOUT"), { code: "ETIMEDOUT" });
        },
        close: () => undefined
      };
    });
    await expect(
      driver.send({
        to: [RECIPIENT],
        subject: "hello",
        text: "hello",
        from: SECRET_FROM
      })
    ).rejects.toMatchObject({ name: "MailAccountError", code: "network" });
    expect(attempts).toEqual([SECRET_USERNAME]);
  });

  it("maps nodemailer EAUTH to SMTP authentication failed", async () => {
    const driver = createNodemailerDriver(testCredentials(), (options) =>
      fakeTransport([], options, () => true)
    );
    await expect(driver.verify()).rejects.toBeInstanceOf(MailAccountError);
    await expect(driver.verify()).rejects.toMatchObject({
      message: "SMTP authentication failed.",
      code: "auth"
    });
  });
});

function transportUser(options: Record<string, unknown>): string {
  const auth = options.auth;
  if (auth === null || typeof auth !== "object") return "";
  const user = (auth as { user?: unknown }).user;
  return typeof user === "string" ? user : "";
}

function fakeTransport(
  attempts: string[],
  options: Record<string, unknown>,
  failAuth: (user: string) => boolean
): SmtpTransportHandle {
  const user = transportUser(options);
  attempts.push(user);
  const rejectAuth = () => {
    throw Object.assign(new Error("Invalid login: 535 5.7.8 Authentication failed"), { code: "EAUTH" });
  };
  return {
    verify: async () => {
      if (failAuth(user)) rejectAuth();
      return true;
    },
    sendMail: async () => {
      if (failAuth(user)) rejectAuth();
      return { messageId: "<ok>", accepted: [RECIPIENT], rejected: [] };
    },
    close: () => undefined
  };
}
