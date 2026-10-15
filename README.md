# Baserow MCP

Connect your AI agent to [Baserow](https://baserow.io). Your agent can read and change tables in one Baserow workspace, using only the tools you allow when you sign in.

This repo installs Baserow's MCP server and a short skill that teaches the agent how to use it. It works with Claude, ChatGPT, Codex, Cursor, VS Code, GitHub Copilot, Gemini CLI, OpenCode, Zed, Goose, Windsurf, Pi and other agents.

## Server URL

- **baserow.io**: `https://api.baserow.io/mcp`
- **Self-hosted**: your backend URL followed by `/mcp`, for example `https://baserow.example.com/mcp`. Copy it from Settings → MCP server in Baserow. Sign-in needs `BASEROW_MCP_OAUTH_ENABLED=true` on the backend; it's off by default. Your reverse proxy must send `/mcp`, `/oauth/`, `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource` to the backend. See [MCP OAuth sign-in for self-hosted Baserow](https://github.com/baserow/baserow/blob/develop/docs/installation/mcp-oauth.md).

The examples below use the baserow.io URL. On self-hosted Baserow, use your own URL instead.

## Quick start

This works for most agents:

```
npx add-mcp https://api.baserow.io/mcp -n baserow
npx skills add baserow/baserow-mcp
```

`add-mcp` finds the agents you have installed and adds the server to each. Add `-a <agent>` to pick one, or `-g` to install globally. `skills add` copies the `baserow-basics` skill into your agents' skill folders.

## Install per agent

| Agent | baserow.io | Self-hosted |
|---|---|---|
| Claude Code | [Plugin](#claude-code) | Same plugin, enter your URL when asked |
| Claude.ai, Claude Desktop | [Custom connector](#claudeai-and-claude-desktop) | Same, with your URL |
| ChatGPT | [Custom MCP server](#chatgpt) | Same, with your URL |
| Codex, Cursor, VS Code | `npx plugins add baserow/baserow-mcp` | [Codex](#codex) or [config file](#config-files) |
| GitHub Copilot CLI | `npx plugins add baserow/baserow-mcp` | `copilot mcp add --transport http baserow <your url>` |
| Gemini CLI | `gemini extensions install https://github.com/baserow/baserow-mcp` | `gemini mcp add -t http baserow <your url>` |
| Goose | [Add to Goose](goose://extension?url=https%3A%2F%2Fapi.baserow.io%2Fmcp&type=streamable_http&id=baserow&name=Baserow) | [Quick start](#quick-start) with your URL |
| OpenCode, Windsurf, Zed | [Config file](#config-files) | Same, with your URL |
| Any other agent | [Quick start](#quick-start) | Same, with your URL |

The Codex, Cursor, VS Code, Copilot and Gemini plugins always point at baserow.io, so on self-hosted Baserow add only the server for those agents.

### Claude Code

```
/plugin marketplace add baserow/baserow-mcp
/plugin install baserow@baserow
```

Keep the default URL when asked, or enter your self-hosted URL. To change it later, run `/plugin configure baserow@baserow` in Claude Code. Then run `/mcp`, pick `plugin:baserow:baserow` and sign in.

### Claude.ai and Claude Desktop

Customize → Connectors → + Add → Add custom connector. Name it Baserow and enter your server URL. On Team and Enterprise plans an owner adds it under Organization settings → Connectors.

### ChatGPT

Open Plugins, select the plus button, then Add custom MCP server, and enter your server URL. Menu names change often. On Business and Enterprise plans an admin has to allow custom MCP servers first.

### Codex

```
codex mcp add baserow --url https://api.baserow.io/mcp
codex mcp login baserow
```

### Config files

To add only the server, without the plugin:

- Cursor: [Add to Cursor](cursor://anysphere.cursor-deeplink/mcp/install?name=baserow&config=eyJ1cmwiOiJodHRwczovL2FwaS5iYXNlcm93LmlvL21jcCJ9), or `~/.cursor/mcp.json`:
  ```json
  { "mcpServers": { "baserow": { "url": "https://api.baserow.io/mcp" } } }
  ```
- VS Code: [Add to VS Code](vscode:mcp/install?%7B%22name%22%3A%22baserow%22%2C%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.baserow.io%2Fmcp%22%7D), or `.vscode/mcp.json`:
  ```json
  { "servers": { "baserow": { "type": "http", "url": "https://api.baserow.io/mcp" } } }
  ```
- OpenCode, `opencode.json`, then `opencode mcp auth baserow`:
  ```json
  { "mcp": { "baserow": { "type": "remote", "url": "https://api.baserow.io/mcp" } } }
  ```
- Windsurf, `~/.codeium/windsurf/mcp_config.json`:
  ```json
  { "mcpServers": { "baserow": { "serverUrl": "https://api.baserow.io/mcp" } } }
  ```
- Zed, settings:
  ```json
  { "context_servers": { "baserow": { "url": "https://api.baserow.io/mcp" } } }
  ```

The Add to Cursor and Add to VS Code links use the baserow.io URL.

## Signing in

The first time your agent uses Baserow, it opens a Baserow page in your browser. Sign in, pick the workspace and tick the tools the agent may use. Read tools let the agent browse databases, tables and rows; write tools let it create, update and delete rows. Only the read tools are ticked on a first connection. To change the workspace or tools, reconnect the server from your agent's MCP settings.

Your connected apps are listed under Settings → MCP server in Baserow. Disconnect one there to revoke its access.

## Troubleshooting

- **A tool is missing, or no databases are listed.** The connection only has the workspace and tools you picked at sign-in. Reconnect and pick again.
- **The sign-in never starts, or the client says the server doesn't support OAuth or client registration.** On self-hosted Baserow, check that `BASEROW_MCP_OAUTH_ENABLED=true` is set and that the proxy routes the OAuth paths in [Server URL](#server-url). Older Baserow versions don't support OAuth for MCP; update Baserow or use an [endpoint key](#endpoint-keys).
- **The connection fails with a URL you typed.** Copy the URL exactly as Settings → MCP server shows it. It ends in `/mcp`, with no trailing slash.
- **Two Baserow servers in Claude Code.** If you also added a `baserow` server by hand with the same URL, Claude Code shows only that one and hides the plugin's. Keep one: `claude mcp remove baserow` removes the hand-added server.

### Endpoint keys

Older Baserow versions only accept an endpoint key, and the plugin doesn't set this up. Copy the endpoint URL from Settings → MCP server. It ends in `/sse` and contains your key. Add it by hand:

```
npx add-mcp "<endpoint url>" -t sse -n baserow -g
```

Baserow versions with OAuth for MCP also accept the key as a header on `/mcp`, which is useful for scripts:

```
npx add-mcp https://baserow.example.com/mcp -n baserow -g -h "Authorization: Bearer <key>"
```

The key gives full access to its workspace. `-g` writes it to your global agent config instead of the current folder, so it can't end up in a commit.

## Privacy and support

- Privacy policy: https://baserow.io/privacy-policy
- Terms: https://baserow.io/terms-and-conditions
- Help: [community forum](https://community.baserow.io) or [contact us](https://baserow.io/contact)

## Developing

Run `npm install`, then `npm test` and `npm run check`. CI runs the same checks.

The Claude Code plugin declares its server in `.claude-plugin/plugin.json`, so it can use the URL you enter. `.mcp.json` holds the baserow.io URL for other tools that read Claude-format plugins, such as GitHub Copilot CLI.

## License

MIT
