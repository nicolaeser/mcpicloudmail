import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { envFromConfig } from "../auth/resolve.js";
import { readRuntimeConfig } from "../config.js";
import { createMcpServer } from "../mcp/server.js";
import type { SmtpClientFactory } from "../smtp/client.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";

export interface StdioRunOptions {
  readonly env?: NodeJS.ProcessEnv;
  readonly createClient?: SmtpClientFactory;
}

export async function runStdio(options: StdioRunOptions = {}): Promise<void> {
  const env = options.env ?? process.env;
  const config = readRuntimeConfig(env);
  const mailEnv = envFromConfig(config);
  const password = config.password;
  const claims: Record<string, string> = {};
  if (mailEnv.email) claims.email = mailEnv.email;
  if (mailEnv.fromAddress) claims.fromAddress = mailEnv.fromAddress;
  const serverMcp = createMcpServer({
    getToken: () => password,
    getBag: () => ({
      secrets: password ? { appPassword: password } : {},
      claims
    }),
    createClient: options.createClient,
    ...mailEnv
  });
  const transport = new StdioServerTransport();
  await serverMcp.connect(transport);
  process.stderr.write(`${PACKAGE_NAME}/${PACKAGE_VERSION} listening on stdio\n`);
}
