# mcpicloudmail

MCP iCloud Mail. Stdio or HTTP at `/mcp`.

```sh
mcpicloudmail
mcpicloudmail http
```

HTTP is OAuth. Secrets stay on this host.

Env: `ICLOUD_EMAIL`, `ICLOUD_APP_PASSWORD`, `ICLOUD_FROM`, `MCP_OAUTH_SECRET`, `MCP_PUBLIC_URL`, `MCP_AUTH_PASSWORD`.

`main` publishes GHCR `:latest`. `development` publishes `:dev`.

### Connection page

The consent page identifies the requesting application and explains this connector’s purpose.
Only account details needed for sign-in are shown upfront; optional settings expand on demand.
Server access, when required, is a separate step. Light and dark themes follow your device.
