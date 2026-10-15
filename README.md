# Baserow MCP

Connect your AI agent to [Baserow](https://baserow.io). Your agent can read and change tables in one Baserow workspace, using only the tools you allow when you sign in.

This repo installs Baserow's MCP server and a short skill that teaches the agent how to use it. It works with Claude, ChatGPT, Codex, Cursor, VS Code, GitHub Copilot, Gemini CLI, OpenCode, Zed, Goose, Windsurf, Pi and other agents.

## Server URL

- **baserow.io**: `https://api.baserow.io/mcp`
- **Self-hosted**: your backend URL followed by `/mcp`, for example `https://baserow.example.com/mcp`. Copy it from My settings → MCP server in Baserow.

The examples below use the baserow.io URL. On self-hosted Baserow, use your own URL instead.

### Self-hosted requirements

- A Baserow version newer than 2.4.1. Older versions don't have `/mcp` or sign-in; use an [endpoint key](#endpoint-keys) there.
- `BASEROW_MCP_OAUTH_ENABLED=true` on the backend. It's off by default.
- A public HTTPS backend URL, so hosted apps like Claude.ai and ChatGPT can reach it, and outbound HTTPS from the backend, which fetches the apps' client metadata.
- Your reverse proxy sends `/mcp` and paths under `/mcp/`, `/oauth/`, `/.well-known/oauth-authorization-server` and `/.well-known/oauth-protected-resource` to the backend. Match `/mcp` exactly, not as a prefix: the frontend serves the sign-in page at `/mcp-authorize/`.

See [MCP OAuth sign-in for self-hosted Baserow](https://github.com/baserow/baserow/blob/develop/docs/installation/mcp-oauth.md).

## Quick start

For agents without their own install below, pick them with `-a`:

```
npx add-mcp https://api.baserow.io/mcp -n baserow -g -a cursor -a codex
npx skills add baserow/baserow-mcp
```

`npx add-mcp list-agents` lists the agent names. `-g` writes to your user config; without it, `add-mcp` writes config files into the current folder. `skills add` copies the `baserow-basics` skill into your agents' skill folders. On self-hosted Baserow, run `skills add` too, since only the plugins below include the skill.

## Install per agent

| Agent | baserow.io | Self-hosted |
|---|---|---|
| Claude Code | [Plugin](#claude-code) | Same plugin, enter your URL when asked |
| Claude.ai, Claude Desktop | [Custom connector](#claudeai-and-claude-desktop) | Same, with your URL |
| ChatGPT | [Custom MCP server](#chatgpt) | Same, with your URL |
| Codex | [Plugin](#codex) | `codex mcp add baserow --url <your url>` |
| GitHub Copilot CLI | [Plugin](#github-copilot-cli) | [Server only](#github-copilot-cli) |
| Gemini CLI | `gemini extensions install https://github.com/baserow/baserow-mcp` | `gemini mcp add -s user -t http baserow <your url>` |
| Cursor | [Add to Cursor](https://cursor.com/install-mcp?name=baserow&config=eyJ1cmwiOiJodHRwczovL2FwaS5iYXNlcm93LmlvL21jcCJ9) | [Config file](#config-files) |
| VS Code | [Add to VS Code](https://vscode.dev/redirect/mcp/install?name=baserow&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fapi.baserow.io%2Fmcp%22%7D) | [Config file](#config-files) |
| Goose | [Add to Goose](https://goose-docs.ai/extension?url=https%3A%2F%2Fapi.baserow.io%2Fmcp&type=streamable_http&id=baserow&name=Baserow) | [Quick start](#quick-start) with your URL |
| OpenCode, Windsurf, Zed | [Config file](#config-files) | Same, with your URL |
| Any other agent | [Quick start](#quick-start) | Same, with your URL |

The Codex, Copilot and Gemini plugins and the Add to buttons always point at baserow.io, so on self-hosted Baserow add only the server for those agents.

### Claude Code

```
/plugin marketplace add baserow/baserow-mcp
/plugin install baserow@baserow
```

When it asks for the URL, press Esc to keep baserow.io, or enter your self-hosted URL. To change it later, run `/plugin configure baserow@baserow`.

### Claude.ai and Claude Desktop

Customize → Connectors → + Add → Add custom connector. Name it Baserow and enter your server URL. On Team and Enterprise plans an owner adds it under Organization settings → Connectors.

### ChatGPT

Open Plugins, select the plus button, then Add custom MCP server, and enter your server URL. Menu names change often. On Business and Enterprise plans an admin has to allow custom MCP servers first.

### Codex

```
codex plugin marketplace add baserow/baserow-mcp
codex plugin add baserow@baserow
codex mcp login baserow
```

### GitHub Copilot CLI

```
copilot plugin marketplace add baserow/baserow-mcp
copilot plugin install baserow@baserow
```

On self-hosted Baserow, add only the server: `copilot mcp add --transport http baserow <your url>`. If the plugin is installed, uninstall it first with `copilot plugin uninstall baserow`; its server replaces yours without a warning.

### Config files

To add only the server, without the plugin:

- Cursor, `~/.cursor/mcp.json`:
  ```json
  { "mcpServers": { "baserow": { "url": "https://api.baserow.io/mcp" } } }
  ```
- VS Code, `.vscode/mcp.json`:
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

## Signing in

Your agent opens a Baserow page in your browser. Sign in, pick the workspace and tick the tools the agent may use. Read tools let the agent browse databases, tables and rows; write tools let it create, update and delete rows. Only the read tools are ticked on a first connection.

Where the sign-in starts:

- Claude Code: run `/mcp`, pick `plugin:baserow:baserow` and authenticate.
- Codex: `codex mcp login baserow`.
- Gemini CLI: `/mcp auth baserow`.
- Claude.ai, ChatGPT, Cursor and VS Code: the Connect or Sign in button next to the server.

To change the workspace or tools, sign in again: re-authenticate the server in your agent, or disconnect the app under My settings → MCP server in Baserow and connect again. A plain reconnect keeps the old sign-in.

## Troubleshooting

- **A tool is missing, or no databases are listed.** The connection only has the workspace and tools you picked at sign-in. Sign in again as described above. Tools that change tables or fields aren't available over MCP.
- **The sign-in never starts, or the client says the server doesn't support OAuth or client registration.** On self-hosted Baserow, check the [self-hosted requirements](#self-hosted-requirements).
- **The connection fails with a URL you typed.** Copy the URL exactly as My settings → MCP server shows it. It ends in `/mcp`, with no trailing slash.
- **Two Baserow servers in Claude Code.** If `claude mcp list` shows the plugin's `plugin:baserow:baserow` and a `baserow` server you added by hand, keep the one that connects. `claude plugin disable baserow@baserow` turns off the plugin's; `claude mcp remove baserow` removes yours.

### Endpoint keys

Baserow 2.4.1 and older only accept an endpoint key, and the plugin doesn't set this up. Copy the endpoint URL from My settings → MCP server. It ends in `/sse` and contains your key. Add it by hand to an agent that supports SSE servers, such as Claude Code, Cursor or VS Code; Codex and Goose don't:

```
npx add-mcp "<endpoint url>" -t sse -n baserow -g -a claude-code
```

Newer versions also accept the key as a header on `/mcp`, which is useful for scripts:

```
npx add-mcp https://baserow.example.com/mcp -n baserow -g -a claude-code -h "Authorization: Bearer <key>"
```

The key gives full access to its workspace. `-g` writes it to your user config instead of the current folder, so it can't end up in a commit.

## Privacy and support

- Privacy policy: https://baserow.io/privacy-policy
- Terms: https://baserow.io/terms-and-conditions
- Help: [community forum](https://community.baserow.io) or [contact us](https://baserow.io/contact)

## Developing

Run `npm install`, then `npm test` and `npm run check`. CI runs the same checks.

The Claude Code plugin declares its server in `.claude-plugin/plugin.json`, so it can use the URL you enter. `.mcp.json` holds the baserow.io URL for other tools that read Claude-format plugins, such as GitHub Copilot CLI and Cursor.

## License

MIT
