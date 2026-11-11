---
name: baserow-dashboards
description: Use when the user asks to read, build or change Baserow dashboards or their widgets, or asks for the figures a dashboard shows, through the Baserow MCP server. Read baserow-basics first for results and missing tools.
---

`list_dashboards`, `list_widgets` and `get_widget_data` are in "Read dashboards", part of
the "Read only" preset. `create_dashboard`, `update_dashboard`, `create_widgets` and
`update_widgets` are in "Edit dashboards", and `delete_widgets` is in "Delete in
dashboards".

## Reading

`list_dashboards` lists the dashboards and `list_widgets` what each widget shows: its type,
title, table, view, fields and aggregations. `get_widget_data` returns the figures as the
dashboard computes them now, for at most 20 widgets a call. A summary returns
`{"result": <value>}`, and a chart returns `{"results": [...]}` with a row per category.
Numbers may come as strings. A widget that can't compute returns `configured: false` and the
problem.

## Building

`create_dashboard` creates an empty dashboard and `update_dashboard` renames one. There's
no tool to delete a dashboard.

Call `get_table_schema` first: every widget needs the `table_id` it reads and field IDs
from that table. `create_widgets` adds at most 20 widgets a call, of three types:

- `summary`: one figure, a `field_id` and an `aggregation_type`.
- `chart`: one or more `series`, each a `field_id` and an `aggregation_type`, optionally
  split by `group_by_field_id`. `chart_type` is `BAR` (the default) or `LINE`.
- `pie_chart`: like a chart, with `chart_type` `PIE` (the default) or `DOUGHNUT`.

Charts and pie charts need a premium licence. Aggregations include `sum`, `average`,
`min`, `max`, `median`, `std_dev`, `variance`, `count`, `not_empty_count`, `empty_count`
and `unique_count`; which fit depends on the field type. `count` counts rows, and
`not_empty_count` counts rows where the field has a value. To aggregate only some rows,
give a `view_id` and filter that view with the `baserow-databases` skill. Widgets can't
have filters of their own.

```json
{ "type": "summary", "title": "Open deals", "table_id": 12, "field_id": 41, "aggregation_type": "sum", "view_id": 7 }
{ "type": "chart", "title": "Revenue by stage", "table_id": 12, "series": [{ "field_id": 41, "aggregation_type": "sum" }], "group_by_field_id": 42 }
```

## Changing

`update_widgets` changes only the values you give. `series` replaces all of a chart's
series, and `clear` removes `view_id` or `group_by_field_id`. A widget's type can't
change. `delete_widgets` moves widgets to the trash. Each widget is saved on its own, so
check `errors` for the ones that failed; an aggregation that doesn't fit a field comes
back with the ones that do.
