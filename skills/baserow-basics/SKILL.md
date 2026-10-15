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
doesn't exist.

Before `update_rows` or `delete_rows`, show the user which rows will change. Send
large changes in batches of at most 200 rows. Deleted rows go to the trash in
Baserow, where the user can restore them for 3 days by default; there is no undo
tool here.

If `list_databases` returns nothing, the connection points at a workspace without
databases. If a tool you need is missing, it wasn't allowed at sign-in. In both
cases tell the user to reconnect the Baserow MCP server from their agent's MCP
settings, then pick another workspace or tick the tool on the Baserow consent page.
Don't retry the call.
