---
name: baserow-workspace
description: Use when the user asks to find something anywhere in their Baserow workspace, to read or post row comments, or who changed what (the audit log), through the Baserow MCP server. Read baserow-basics first for results and missing tools.
---

## Search

`search_workspace` searches databases, tables, fields, rows, application builders,
automations, dashboards and agents by name or content, and returns only what the user
can access. Use it when the user names something without saying where it is. Narrow it
with `types`: `database`, `database_table`, `database_field`, `database_row`, `builder`,
`automation`, `dashboard` or `agent`. It returns at most 50 results a page; fetch the
next `page` before saying something doesn't exist.

A row result has its `table_id` and `row_id` in its metadata. Use them with
`list_table_rows` or `get_table_schema` to read the row and its fields. Search data is
built in the background, so something created a moment ago may not show up yet. If
search finds nothing, look it up with the list tools instead.

`search_workspace` is in "Search the workspace", part of the "Read only" preset.

## Row comments

`list_row_comments` reads a row's comments as plain text, newest first, in "Read
databases". `create_row_comments` posts plain text comments, at most 100 a call, in
"Edit databases". Mentions aren't supported. Both take the `table_id` and `row_id`, and
need a premium licence. Comments can't be edited or deleted with these tools, so show
the user the text before posting.

## Audit log

`list_audit_log` lists who did what in the workspace, newest first: the user, the
action and when. Filter by `query`, `user_id` or `action_types`, such as `create_table`
or `delete_rows`, and by time with `from_timestamp` and `to_timestamp`, in ISO format
with the user's timezone offset, like `2026-11-02T09:00:00+01:00`.

It needs an advanced or enterprise licence, and only workspace admins can use it. It's
off unless the user turned on "Read the audit log", even with the "Read only" preset. It
only covers this workspace. If the user isn't an admin, say so rather than retrying.
