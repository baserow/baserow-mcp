# Security

Please don't report vulnerabilities in a public issue. Email a detailed report to bram@baserow.io, the same address as for [Baserow itself](https://github.com/baserow/baserow/blob/develop/SECURITY.md).

## What this repo covers

This repo holds manifests and a skill that point AI agents at Baserow's MCP server. The server, sign-in, tokens and permissions live in Baserow, at `https://api.baserow.io/mcp` or on your own instance. A problem there is a Baserow vulnerability, and the same email applies.

## Using the server safely

- Each connection reaches one workspace and only the tools you tick at sign-in. Tick the read tools only unless the agent needs to change data.
- Data in your tables reaches the agent as tool output. A row can contain text written to steer the agent (prompt injection), so review what the agent wants to change before you approve it.
- Disconnect apps you no longer use under Settings → MCP server in Baserow.
- Endpoint keys give full access to their workspace. Keep them out of repos; the README's `add-mcp` commands use `-g` for this reason.
