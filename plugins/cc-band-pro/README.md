# cc-band-pro

cc-skin-pro's powerline bar, and nothing else, locked to Catppuccin Mocha. No
themes, no picker, no settings: one band above the prompt. It holds the mods'
modules as blocks, left to right, each a click away from the pane it opens.

```
  diff 3   tree    marks   Running the parser tests   git   inv   plan
```

| Block | Shows | A click |
| --- | --- | --- |
| Diff | How many Edit, MultiEdit and Write calls the last turn made | Opens cc-band-pro's own Diff pane: step through each edit, `p`/`n`, Esc closes |
| Tree | `tree` | Runs `/filetree` |
| Marks | A bookmark icon | Opens the Bookmarks pane (the `transcript-bookmarks` plugin) |
| Task | task-rail's segment: its one-line status, cut to 28 cells | Opens the Rail pane (task-rail); runs `/rail pane` |
| Studio | product-studio's segment: its one-line summary, cut to 36 cells | Opens the Studio pane (product-studio); runs `/studio` |
| Git | git-board's segment, e.g. `⎇ main · 3 reflog`, cut to 28 cells; `git` while it publishes none | Opens the Git pane (git-board); runs `/gb` |
| Inventory | inventory-pane's segment, e.g. `mem 4 · skill 12 · mod 7`, cut to 28 cells; `inv` while it publishes none | Opens the Inventory pane (inventory-pane); runs `/inv` |
| Plan | plan-board's segment, e.g. `P0 open 5 · overdue 0`, cut to 28 cells; `plan` while it publishes none | Opens the Plan pane (plan-board); runs `/pb` |

A Task or Studio segment with no letter or digit (a lone glyph such as `○`) is
left out, as an empty one is: a block of its own with no words would read as a
stray. Git, Inventory and Plan show their label instead.

The model, its effort and the context usage are not drawn here: a status line
shows them.

## Install

```
/plugin install cc-band-pro --marketplace lin-mouren/cc-skin-pro
```

## What it needs

- **A Nerd Font** in the terminal, for the powerline caps and the icons.
- **filetree** and **transcript-bookmarks**, for the tree and marks blocks.
  cc-band-pro only opens their panes, so each stays in, and is kept up in, its
  own plugin. A block whose plugin is off says so in a toast.
- **task-rail**, **product-studio**, **git-board**, **inventory-pane** and
  **plan-board**, for the other five blocks. None of them is a dependency.
  Task and Studio show the text their mod publishes, and leave their block out
  while the mod is absent or publishes nothing. Git, Inventory and Plan always
  show; a press with its mod off says so in a toast.

## How it lives with the other bands

The prompt has one band slot, shared by every plugin that draws there. cc-band-pro
draws its row as the band and keeps whatever the plugins beneath it draw
(`next(e)`): the cache-tax row still draws below the band, as the skins mod's
usage band and the rest do.

The Task and Studio modules come from other mods, not from cc-band-pro: task-rail
publishes its status as the `segment` of its state, and product-studio its summary
the same way. cc-band-pro reads each one while it draws the band, so the module
follows the mod's text and drops out when the mod is absent.

- Installed after skins, the skins band sits on top and this bar under it.
- A plugin above it in the chain that answers the band alone, as smart-compact
  does while it offers a compact, hides it until that offer is gone.
- Turn cc-skin-pro off: it draws the same bar, and two would stack.

## Clicks while Claude works

Every pane opens at once, mid-turn or not, and no press leaves a line in the
conversation. The Diff pane is cc-band-pro's own. The other panes are opened by
their ids, each drawn by its own mod's render hook. That works for filetree, which
keeps its tree following the cwd, and for transcript-bookmarks, which keeps its
list from `$.store` at session start. When a pane's render hook does not answer,
or the layout cannot hold it (filetree wants the fullscreen layout at 110 columns
or more), the block falls back to the plugin's command, and a command run from a
plugin waits for the turn to end, so that press is queued and a toast says so.
Task falls back to `/rail pane`, because its bare command toggles the folding of
tool calls.

Typing `/filetree` yourself still opens it mid-turn, as that plugin allows.

## Files

- `hooks/register.tsx`: the hooks: band, diff recording, clicks.
- `hooks/bar.tsx`: the colors, icons, blocks and the powerline drawing.
- `hooks/diff.tsx`: the line diff and the Diff pane.
- `types/index.d.ts`: the state contract.

MIT licensed.
