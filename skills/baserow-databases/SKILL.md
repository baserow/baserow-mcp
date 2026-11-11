---
name: baserow-databases
description: Use when the user asks to create or change Baserow databases, tables, fields, views, view filters, sorts, hidden fields or row colours through the Baserow MCP server. Read baserow-basics first for rows, results and missing tools.
---

These tools change the structure of a database. Creating and changing is in "Edit
databases"; `delete_fields`, `delete_views`, `delete_view_filters` and
`delete_row_colours` are in "Delete in databases". Both are off until the user turns
them on.

Call `get_table_schema` before changing a table, and `list_views` before changing a
view. Fields, views, filters and sorts take field IDs; rows take field names.

## Databases and tables

`create_database` creates an empty database and `update_database` renames one. There's
no tool to delete a database or to rename or delete a table.

Pass related tables in one `create_tables` call, so a `link_row` or `lookup` field can
name another table of the call. Each table needs a `name`, a `primary_field_name`
(always a text field) and `fields`. The reverse link field is created for you. A table
with the same name as an existing one isn't created: it comes back in `reused_tables`,
with the differences from what you asked for.

Field types are `text`, `long_text`, `number`, `rating`, `boolean`, `date`, `link_row`,
`single_select`, `multiple_select`, `file`, `formula` and `lookup`. For example:

```json
{ "name": "Status", "type": "single_select", "options": [{ "value": "Open", "color": "green" }] }
{ "name": "Project", "type": "link_row", "linked_table": "Projects" }
{ "name": "Client Name", "type": "lookup", "linked_table": "Clients", "target_field": "Name" }
{ "name": "Total", "type": "formula", "formula": "field('Price') * 2" }
```

A formula that doesn't parse isn't created. It comes back in `errors` with the code
`invalid_formula` and the parser's message: correct it and add it with `create_fields`.
List a table before any table whose lookup targets one of its formula or lookup fields,
or add that lookup afterwards with `create_fields`.

## Fields

`create_fields` adds fields to an existing table. `update_fields` renames fields and
changes their settings and select options (`add_options`, `update_options`,
`remove_options`; options you don't list stay). Removing an option clears it from every
row, so confirm with the user first. A field's type and a link's target table can't
change. Replacing the field loses its values, so ask the user before doing that.
`delete_fields` moves fields to the trash; a primary field can't be deleted.

## Views

A new table already has a grid view. `create_views` takes `grid`, `form`, `gallery`,
`kanban`, `calendar` or `timeline`. Each type needs its field: `column_field_id` (single
select) for kanban, `date_field_id` for calendar, `start_date_field_id` and
`end_date_field_id` with the same include time setting for timeline, and
`cover_field_id` (file) for gallery. A form shows only the fields in its
`field_options`. `public: true` makes a view readable by anyone with its link, so only
set it when the user asks.

- `set_view_sorts` replaces all the sorts of a view, most important first. An empty
  list removes them.
- `set_field_visibility` hides or shows fields. The primary field of a grid can't be
  hidden.
- `add_row_colours` colours rows by a single select field or by conditions written like
  filters, and needs a premium licence. Colours are blue, green, cyan, orange, yellow,
  red, brown, purple, pink or gray, optionally with `light-`, `dark-` or `darker-` in
  front; hex colours are refused.
- `delete_views`, `delete_view_filters` and `delete_row_colours` take the IDs
  `list_views` shows.

## Filters

`create_view_filters` adds filters, and a view shows the rows that match all of them.
Each filter has a `field_id`, a `type` matching the field's type, an `operator` and a
`value`:

| type | operators | value |
| --- | --- | --- |
| `text` | `equal`, `not_equal`, `contains`, `contains_not`, `empty`, `not_empty` | string |
| `number` | `equal`, `not_equal`, `higher_than`, `lower_than`, `empty`, `not_empty` | number |
| `date` | `equal`, `not_equal`, `after`, `before` | see below |
| `single_select`, `multiple_select` | `is_any_of`, `is_none_of` | list of option labels |
| `link_row` | `has`, `has_not` | row ID |
| `boolean` | `equal` | `true` or `false` |

A date filter also takes a `mode`: an ISO date with `exact_date`, a whole number with
`nr_days_ago` and similar, and no value with `today` and similar. Pass the user's
`timezone`, such as `Europe/Amsterdam`, so `today` follows their day. Set `or_equal` to
`true` for "or equal to" on number and date filters. A filter that can't be applied
comes back in `errors` with the reason.

To change a filter, delete it with `delete_view_filters` and add the new one.
