# Baserow MCP

Connect your AI agent to [Baserow](https://baserow.io). Your agent can read and change tables in one Baserow workspace, using only the tools you allow when you sign in.

This repo installs Baserow's MCP server and a short skill that teaches the agent how to use it. It works with Claude, ChatGPT, Codex, Cursor, VS Code, GitHub Copilot, Gemini CLI, OpenCode, Zed, Goose, Windsurf, Pi and other agents.

## Install for baserow.io

The server URL is `https://api.baserow.io/mcp`.

### Claude Code

```
/plugin marketplace add baserow/baserow-mcp
/plugin install baserow@baserow
```

Keep the default URL when asked. Then run `/mcp`, pick `plugin:baserow:baserow` and sign in.

### Claude.ai and Claude Desktop

Customize → Connectors → + Add → Add custom connector. Name it Baserow and use `https://api.baserow.io/mcp`. On Team and Enterprise plans an owner adds it under Organization settings → Connectors.

### ChatGPT

Open Plugins, select the plus button, then Add custom MCP server, and use `https://api.baserow.io/mcp`. Menu names change often. On Business and Enterprise plans an admin has to allow custom MCP servers first.

### Codex, Cursor, VS Code, GitHub Copilot CLI

```
npx plugins add baserow/baserow-mcp
```

Or add only the server:

- Cursor: [Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=baserow&config=eyJ1cmwiOiJodHRwczovL2FwaS5iYXNlcm93LmlvL21jcCJ9)
- VS Code: [Add to VS Code](vscode:mcp/install?%7B%22name%22%3A%22baserow%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.baserow.io%2Fmcp%22%7D)
- Codex: `codex mcp add baserow --url https://api.baserow.io/mcp`, then `codex mcp login baserow`

### Gemini CLI

```
gemini extensions install https://github.com/baserow/baserow-mcp
```

### Goose

[Add to Goose](goose://extension?url=https%3A%2F%2Fapi.baserow.io%2Fmcp&type=streamable_http&id=baserow&name=Baserow)

### Any other agent

```
npx add-mcp https://api.baserow.io/mcp -n baserow
npx skills add baserow/baserow-mcp
```

`add-mcp` finds the agents you have installed and adds the server to each. Add `-a <agent>` to pick one, or `-g` to install globally. `skills add` copies the `baserow-basics` skill into your agents' skill folders.

## Self-hosted Baserow

Your server URL is your backend URL followed by `/mcp`, for example `https://baserow.example.com/mcp`. You can copy it from Settings → MCP server in Baserow.

Your reverse proxy must send `/mcp`, `/oauth/` and `/.well-known/` to the Baserow backend.

The quickest way for any agent:

```
npx add-mcp https://baserow.example.com/mcp -n baserow
npx skills add baserow/baserow-mcp
```

Per agent:

- **Claude Code**: install the plugin as above and enter your URL when asked. To change it later, run `claude plugin configure baserow@baserow`.
- **Claude.ai and Claude Desktop**: add a custom connector with your URL.
- **ChatGPT**: add a custom MCP server with your URL.
- **Codex**: `codex mcp add baserow --url https://baserow.example.com/mcp`, then `codex mcp login baserow`.
- **Cursor**, `~/.cursor/mcp.json`:
  ```json
  { "mcpServers": { "baserow": { "url": "https://baserow.example.com/mcp" } } }
  ```
- **VS Code**, `.vscode/mcp.json`:
  ```json
  { "servers": { "baserow": { "type": "http", "url": "https://baserow.example.com/mcp" } } }
  ```
- **OpenCode**, `opencode.json`:
  ```json
  { "mcp": { "baserow": { "type": "remote", "url": "https://baserow.example.com/mcp" } } }
  ```
  Then `opencode mcp auth baserow`.
- **Gemini CLI**: `gemini mcp add -t http baserow https://baserow.example.com/mcp`
- **Windsurf**, `~/.codeium/windsurf/mcp_config.json`:
  ```json
  { "mcpServers": { "baserow": { "serverUrl": "https://baserow.example.com/mcp" } } }
  ```
- **Zed**, settings:
  ```json
  { "context_servers": { "baserow": { "url": "https://baserow.example.com/mcp" } } }
  ```

The Codex, Cursor, VS Code, Copilot and Gemini plugins always point at baserow.io. On self-hosted Baserow, use `npx add-mcp` or the snippets above for those agents.

## Signing in

The first time your agent uses Baserow, it opens a Baserow page in your browser. Sign in, pick the workspace and tick the tools the agent may use. To change either, reconnect the server from your agent's MCP settings.

Your connected apps are listed under Settings → MCP server in Baserow. Disconnect one there to revoke its access.

## Endpoint keys (scripts)

Older Baserow versions only accept an endpoint key, and the plugin doesn't set this up. Copy the endpoint URL from Settings → MCP server. It ends in `/sse` and contains your key. Add it by hand:

```
npx add-mcp "<endpoint url>" -t sse -n baserow
```

Baserow versions with OAuth for MCP also accept the key as a header on `/mcp`:

```
npx add-mcp https://baserow.example.com/mcp -n baserow -h "Authorization: Bearer <key>"
```

## Troubleshooting

- **A tool is missing, or no databases are listed.** The connection only has the workspace and tools you picked at sign-in. Reconnect and pick again.
- **The sign-in never starts, or the client says the server doesn't support OAuth or client registration.** Your Baserow version doesn't support OAuth for MCP yet. Update Baserow, or use an endpoint key as described in [Endpoint keys](#endpoint-keys-scripts).
- **The connection fails with a URL you typed.** Copy the URL exactly as Settings → MCP server shows it. It ends in `/mcp`, with no trailing slash.
- **Two Baserow servers in Claude Code.** If you also added a `baserow` server by hand with the same URL, Claude Code shows only that one and hides the plugin's. Keep one: `claude mcp remove baserow` removes the hand-added server.

## Developing

Run `npm install`, then `npm test` and `npm run check`. CI runs the same checks.

Claude Code started inside this repo also loads `.mcp.json` as a project server. Ignore that entry; it only works when installed as a plugin.

## License

MIT
