import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { confirmField, listPayload, requireConfirm } from "../../mcp/format.js";
import { mailboxField } from "./helpers.js";

export const subscribeMailbox = defineTool(
    "icloud_subscribe_mailbox",
    "Subscribe mailbox",
    "Add a folder to the IMAP LSUB subscription list. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      mailbox: mailboxField
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "icloud_subscribe_mailbox");
        return ctx.client.subscribeMailbox(input.mailbox);
      })
  );
