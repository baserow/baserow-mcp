---
name: baserow-app-builder
description: Use when the user asks to read, build or change a Baserow application builder (an app, website or portal) through the Baserow MCP server, including its pages, data sources, elements, buttons, forms, styles, theme and login. Read baserow-basics first for results and missing tools.
---

`list_builders`, `list_pages`, `list_data_sources`, `list_elements` and
`list_element_actions` are in "Read application builders", part of the "Read only"
preset. The create, update, move, style and theme tools are in "Edit application
builders", and `delete_element_items` is in "Delete in application builders".

A request for an application, app or website means an application builder. Create one
with `create_builder`, then add pages with `create_pages`. There's no tool to delete an
application, a page or an element, or to publish an application: the user publishes it
in Baserow.

## Reading first

Call `list_pages` for a builder's pages, path parameters, login page, user sources and
roles. Then `list_data_sources`, `list_elements` and `list_element_actions` for a page.
Headers, footers and their data sources are on a shared page and show up with
`page_name` `"[shared]"`.

## Building a page

1. Create the pages with `create_pages`. A path like `/products/:id` adds `id` as a
   text parameter unless `path_params` says `numeric`.
2. Connect the page to a table with `create_data_sources`: `list_rows` for many rows,
   `get_row` for one. To filter or sort rows, point `view_id` at a database view; set
   that view up first with the `baserow-databases` skill.
3. Add elements: `create_layout_elements` (column, simple_container, header, footer,
   menu), `create_display_elements` (heading, text, button, link, image),
   `create_collection_elements` (table, repeat) and `create_form_elements`
   (form_container and its inputs). Put elements in a container with
   `parent_element`, and in a column's slot with `place_in_container`, from `"0"`.
4. Give buttons and forms something to do with `create_element_actions`: show a
   notification, open a page, create, update or delete a row, refresh a data source or
   log out. A button does nothing until it has a click action, and a form_container
   needs a `submit` action.

`setup_page` does steps 2 to 4 for one page in one call. A ref only works inside the call
that creates it, and formulas need real IDs, so add anything that reads an input or data
source from that call in a second call, with the IDs it returned. Calling it again
creates everything again, so after errors resend only the failed items.

## Formulas

Give dynamic values as formulas; plain text is stored as fixed text. Use field IDs, never
field names:

- `get('page_parameter.<name>')` reads a page parameter.
- `get('current_record.field_<id>')` reads the row inside a table or repeat, and
  `get('current_record.id')` its ID.
- `get('data_source.<id>.field_<id>')` reads a `get_row` data source anywhere on its
  page.
- `get('form_data.<element id>')` reads a form input in an action.
- `get('previous_action.<action id>.<field>')` reads what an earlier action returned.

In row actions, `row_id` and field values are always formulas, so quote fixed text:
`'like this'`. An invalid formula comes back in `formula_errors` and the value is left
empty or keeps what it had. Fix it with the matching update tool, such as
`update_element` or `update_element_action`. Don't create the action again: then both
run.

## Links and page parameters

A link, menu item or `open_page` action going to a page with path parameters must give
exactly those parameters, in `link_page_parameters` or `page_parameters`, or it's
refused. Menu items can't link to a page that has parameters; the user sets those in the
editor. When `update_page` changes a page's parameters, its result lists in
`navigations_to_fix` the links and actions to fix.

## Changing

`update_element` changes an element's text and settings, table columns
(`add_table_columns`, `update_table_columns`, `reorder_table_columns`) and menu items. It
deletes nothing: `delete_element_items` removes columns or menu items, with their click
actions, and can't be undone, so only remove what the user asked for.
`update_element_style` changes borders, spacing, colours and widths. `move_elements`
moves elements within their page.

`set_theme` replaces every theme setting of the application and can't be undone, so ask
the user first.

## Login

`setup_user_source` lets people log in: it uses a table of users, or creates a Users
table with example rows, and sets up a login page with a login form. It writes to a
database, so tell the user what it will create. Each user needs a password before they
can log in. It comes with Baserow's enterprise edition, so some servers don't offer it.
Pages with `visibility` `logged-in` are only shown to logged-in users.
