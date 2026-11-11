# Changelog

Each release is tagged `v<version>`, matching the version in every manifest. Publishing a GitHub release for the tag publishes `server.json` to the MCP Registry.

## 1.0.0 (unreleased)

Needs Baserow 3.0.0 or newer.


- New skills: `baserow-databases`, `baserow-automations`, `baserow-dashboards`, `baserow-app-builder` and `baserow-workspace`, for the database, automation, dashboard, application builder, search, row comment and audit log tools.
- `baserow-basics` covers rows, the shared error format and undo, and tells users to turn missing tools on with Edit tools in Settings.
- README and listing descriptions cover the new tools, tool groups and Edit tools.

## 0.1.1 (2026-10-16)

- Baserow MCP server for Claude, ChatGPT, Codex, Cursor, VS Code, GitHub Copilot, Gemini CLI and other agents, with the `baserow-basics` skill.
- Claude Code asks for the server URL, so it works with self-hosted Baserow.
- `server.json` for the MCP Registry, with a remote for baserow.io and one for self-hosted hosts.
