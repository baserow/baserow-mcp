---
name: baserow-automations
description: Use when the user asks to read, build, change, publish or pause Baserow automations, workflows or workflow nodes through the Baserow MCP server. Read baserow-basics first for results and missing tools.
---

Automation tools are off until the user turns them on, even with the "Read only" preset:
`list_workflows`, `list_nodes` are in "Read automations"; `create_automation`,
`update_automation`, `create_workflows`, `add_nodes`, `update_nodes`,
`publish_workflow`, `pause_workflow` are in "Edit automations"; `delete_nodes` is in
"Delete in automations".

Call `list_workflows` to find automations and their workflows, and `list_nodes` before
changing a workflow. It returns each node's ID, type, position and output paths. Row
triggers and row actions need a `table_id` and field IDs, so call `get_table_schema` too.
If the workspace has no automation, create one with `create_automation`.

## Building a workflow

`create_workflows` takes a `name`, a `trigger` and `nodes`. Every trigger and node has a
`ref` of your choice, and each node names the node it follows in `previous_node_ref`. To
extend an existing workflow, use `add_nodes`, where `previous_node_ref` is a ref from the
same call or an existing node's ID as a string.

- Triggers: `periodic` (with `periodic_interval`, in UTC), `http_trigger`, `rows_created`,
  `rows_updated`, `rows_deleted` (with `rows_triggers_settings.table_id`).
- Nodes: `smtp_email`, `slack_write_message`, `create_row`, `update_row`, `delete_row`,
  `ai_agent`, `router`. `update_row` and `delete_row` need a `row_id`.

A router has `edges`, each with a `label` and a `condition`, and the first match wins. A
default branch is added for you. Attach a node to a branch with `router_edge_label`.

```json
{
  "name": "Big orders",
  "trigger": { "ref": "trigger", "type": "rows_created", "rows_triggers_settings": { "table_id": 12 } },
  "nodes": [
    {
      "ref": "check",
      "type": "router",
      "previous_node_ref": "trigger",
      "edges": [{ "label": "Big", "condition": "greater_than(get('previous_node.trigger.0.field_34'), 100)" }]
    },
    {
      "ref": "email",
      "type": "smtp_email",
      "previous_node_ref": "check",
      "router_edge_label": "Big",
      "to_emails": "sales@example.com",
      "subject": "concat('Big order ', get('previous_node.trigger.0.id'))",
      "body": "A big order came in."
    }
  ]
}
```

A workflow with the same name as an existing one isn't created or changed: it comes back
in `reused_workflows`.

## Formulas

A value that looks like a formula is stored as one, and anything else as plain text. To
store text that looks like a formula, send it as a quoted string, such as `'Call now()'`. A
router condition is always a formula.

Read an earlier node with `get('previous_node.<node>...')`, where `<node>` is an existing
node's ID or the ref of an earlier node in the same call. Use only paths `list_nodes` shows
for that node. A row trigger's rows are a list, so its fields are at
`get('previous_node.<trigger>.0.field_<field id>')` and the row ID is at
`get('previous_node.<trigger>.0.id')`. Don't use field names in these paths.

An invalid formula comes back in `formula_errors` with the reason and the paths the node
does output. On a new node the value is left empty; on an update it keeps what it had.
Fix it with `update_nodes`, not by adding the node again.

## Changing a workflow

`update_nodes` changes labels, settings, a row action's table and values, and router
conditions by branch label. Values you leave out keep theirs. Give each node once, with all
its changes. It can't change a node's type or a trigger's settings.

Show the user what will change before `update_nodes` or `delete_nodes`. `delete_nodes` moves
nodes to the trash, and a router with nodes on its branches can't be deleted. There's no
tool to delete a workflow or an automation.

## Publishing

A new workflow is a draft and doesn't run. `publish_workflow` makes the current version
live, and from then on it sends real emails and messages and writes real rows. Always get
the user's approval first, and check `warnings` in the result for misconfigured nodes.

The live copy doesn't change when you edit the workflow: publish again to replace it.
`pause_workflow` stops a live workflow; events while it's paused are never run.
Publishing a paused workflow makes the current draft live, with any edits since. In
`list_workflows`, the state is that of the last published version, so a live workflow
can have edits that aren't running yet.
