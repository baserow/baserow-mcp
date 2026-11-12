---
name: baserow-basics
description: Use when the user asks anything of Baserow through the Baserow MCP server, such as reading or changing rows, or when a Baserow tool or database is missing.
---

Each Baserow connection is tied to one workspace and to the tools the user allowed.
Only that workspace and those tools are available. Use any tool the server offers,
even if these skills don't mention it. For more specific work, also use:

- `baserow-databases` to create or change databases, tables, fields, views, filters,
  sorts and row colours.
- `baserow-automations` for automations and workflows.
- `baserow-dashboards` for dashboards and widgets.
- `baserow-app-builder` for application builders: pages, elements and login.
- `baserow-workspace` to search the whole workspace, for row comments and for the audit
  log.

## Finding things

To find something by name or content anywhere in the workspace, use `search_workspace`
as the `baserow-workspace` skill describes. To walk a database, call `list_applications`
(`list_databases` on older servers), then `list_tables`, then `get_table_schema` for the
table you need. Only use IDs these calls returned; never guess an ID. Use field names
exactly as the schema returns them.

## Rows

Read rows with `list_table_rows` and a search term instead of reading the whole table.
It returns `count`, the total number of matching rows, and one page of at most `size`
rows (100 by default, 200 at most). When `count` is larger than the rows you got, fetch
the next `page` or narrow the search before saying a row doesn't exist. Search may skip
link-to-table, boolean, collaborator and duration fields, so when a search on one of
those values finds nothing, page through the rows and compare the field yourself.

`create_rows` and `update_rows` take values by field name. Before `update_rows` or
`delete_rows`, show the user which rows will change. Send at most 200 rows a call.

## Results and undo

A call can succeed and still leave things out. When a result has `errors`, those items
failed and the others were saved. Each error says which item failed and why, and many
have a `code`, such as `not_found`, `permission_denied`, `invalid_input`, `conflict` or
`invalid_formula`. Read them before telling the user it's done, and fix and resend only
the failed items. A call that fails as a whole returns an error message instead, such as
"Not found in this workspace." or "Invalid arguments. …".

Changes made through these tools can't be undone with Baserow's undo. Deleted rows,
fields, views, nodes and widgets go to the trash, where the user can restore them for 3
days by default. A feature that needs a licence the user doesn't have says so; tell the
user instead of retrying.

## Missing tools or data

If `list_applications` returns nothing, the connection points at a workspace without
databases. To use another workspace, the user has to sign in again: re-authenticate the
Baserow server in their agent (a plain reconnect keeps the old sign-in), or disconnect
the app under My settings → MCP server in Baserow and connect again.

If a tool you need is missing, it's turned off for this connection, or this Baserow
version doesn't have it. Don't retry the call. New tools stay off for existing
connections, and the "Read only" preset at sign-in only turns on search and the read
tools for databases, dashboards and application builders. Ask the user to click Edit
tools next to the app under My settings → MCP server, and turn on the group with the
tool, such as "Edit databases" or "Read automations". The change applies without
signing in again, though some agents need a new session to see it. With an endpoint
key, tools can only be changed through the API.

If no tool does what the user asks, say so and point them to Baserow.
