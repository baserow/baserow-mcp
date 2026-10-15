---
name: baserow-basics
description: Use when the user asks to read or change data in Baserow tables through the Baserow MCP server.
---

Each Baserow connection is tied to one workspace and to the tools the user ticked
when they signed in. Only that workspace and those tools are available.

Find data before changing it: call `list_databases`, then `list_tables`, then
`get_table_schema` for the table you need. Only use database and table IDs that
these calls returned; never guess an ID. Use field names exactly as the schema
returns them.

Read rows with `list_table_rows` and a search term instead of reading the whole
table. It returns `count`, the total number of matching rows, and one page of at
most `size` rows (100 by default, 200 at most). When `count` is larger than the
rows you got, fetch the next `page` or narrow the search before saying a row
doesn't exist. Search may skip link-to-table, boolean, collaborator and duration
fields, so when a search on one of those values finds nothing, page through the
rows and compare the field yourself.

Before `update_rows` or `delete_rows`, show the user which rows will change. Send
large changes in batches of at most 200 rows. Deleted rows go to the trash in
Baserow, where the user can restore them for 3 days by default; there is no undo
tool here.

This server reads databases, tables and fields but only changes rows. You can't
create or change databases, tables or fields through it, so say so instead of
looking for a tool.

If `list_databases` returns nothing, the connection points at a workspace without
databases. If a row tool you need is missing, it wasn't allowed at sign-in. In
both cases the user has to sign in again to pick another workspace or tick the
tool: re-authenticate the Baserow server in their agent (a plain reconnect keeps
the old sign-in), or disconnect the app under My settings → MCP server in Baserow
and connect again. Don't retry the call.
