import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MissingTokenError } from "../errors.js";
import { toolError } from "./format.js";
import { TOOL_CATALOG } from "./catalog.js";
import type { LoginBag } from "../auth/fields.js";
import { credentialsFromBag, type MailEnv } from "../auth/login-fields.js";
import {
  defaultClientFactory,
  type SmtpAccountClient,
  type SmtpClientFactory
} from "../smtp/client.js";
import type { ToolContext } from "../types.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";

export interface McpServerOptions extends MailEnv {
  readonly getToken: () => string | undefined;
  readonly getBag?: (() => LoginBag) | undefined;
  readonly createClient?: SmtpClientFactory | undefined;
}

export const MCP_INSTRUCTIONS = [
  "iCloud Mail: start with icloud_whoami, then icloud_verify if the connection is unknown.",
  "Send: icloud_send (to, subject, text/html). Raw RFC822: icloud_send_raw.",
  "Read: icloud_list_mailboxes, icloud_list_messages, icloud_search_messages, icloud_get_message, icloud_get_attachment.",
  "Organize: icloud_set_flags, icloud_move_messages, icloud_copy_messages, icloud_delete_messages, icloud_append_message.",
  "Mailbox admin: icloud_create_mailbox, icloud_rename_mailbox, icloud_delete_mailbox, icloud_get_quota.",
  "Writes need confirm: true. Secrets are never returned."
].join(" ");

export function createMcpServer(options: McpServerOptions): McpServer {
  const server = new McpServer(
    { name: PACKAGE_NAME, version: PACKAGE_VERSION },
    { capabilities: { tools: {} }, instructions: MCP_INSTRUCTIONS }
  );
  let sharedClient: SmtpAccountClient | undefined;
  const factory = options.createClient ?? defaultClientFactory;

  for (const entry of TOOL_CATALOG) {
    const config = {
      title: entry.title,
      description: entry.description,
      inputSchema: schemaShape(entry.inputSchema),
      annotations: entry.annotations
    };
    const callback = async (args: Record<string, unknown> | undefined) => {
      let ctx: ToolContext | undefined;
      try {
        ctx = createToolContext(options, factory, sharedClient);
        if (sharedClient === undefined) sharedClient = ctx.client;
        return await entry.handler(ctx, args ?? {});
      } catch (error) {
        return toolError(error, ctx?.secrets ?? []);
      }
    };
    server.registerTool(entry.name, config, callback as never);
  }

  return server;
}

function createToolContext(
  options: McpServerOptions,
  factory: SmtpClientFactory,
  shared: SmtpAccountClient | undefined
): ToolContext {
  const token = options.getToken();
  if (token === undefined || token.length === 0) throw new MissingTokenError();
  const bag = options.getBag?.() ?? { secrets: { password: token }, claims: {} };
  const creds = credentialsFromBag(bag, options);
  if (creds === undefined) throw new MissingTokenError();
  const client = shared ?? factory(creds);
  const secrets = [token, creds.password, ...client.secretValues()];
  return {
    client,
    bag,
    secrets: [...new Set(secrets.filter((value) => value.length > 0))]
  };
}

function schemaShape(schema: z.ZodTypeAny): z.ZodRawShape {
  if (schema instanceof z.ZodObject) {
    return schema.shape as z.ZodRawShape;
  }
  return {};
}
