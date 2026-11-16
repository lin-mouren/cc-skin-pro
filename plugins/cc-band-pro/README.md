# cc-band-pro

cc-skin-pro's powerline bar, and nothing else, locked to Catppuccin Mocha. No
themes, no picker, no settings: one band above the prompt. It holds the mods'
modules as blocks, left to right, each a click away from the pane its mod opens.

```
  diff 3   tree    marks   Running the parser tests   git   inv   plan
```

| Block | Shows | A click |
| --- | --- | --- |
| Diff | How many Edit, MultiEdit and Write calls the last turn made | Opens cc-band-pro's own Diff pane: step through each edit, `p`/`n`, Esc closes |
| Tree | `tree` | Runs `/filetree open`, which opens the file tree (filetree) |
| Marks | A bookmark icon | Runs `/bookmarks`, which opens the Bookmarks pane (transcript-bookmarks) |
| Task | task-rail's segment: its one-line status, cut to 28 cells | Runs `/rail pane`, which opens the Rail pane (task-rail) |
| Studio | product-studio's segment: its one-line summary, cut to 36 cells | Runs `/studio`, which opens the Studio pane (product-studio) |
| Git | git-board's segment, e.g. `⎇ main · 3 reflog`, cut to 28 cells; `git` while it publishes none | Runs `/gb`, which opens the Git pane (git-board) |
| Inventory | inventory-pane's segment, e.g. `mem 4 · skill 12 · mod 7`, cut to 28 cells; `inv` while it publishes none | Runs `/inv`, which opens the Inventory pane (inventory-pane) |
| Plan | plan-board's segment, e.g. `P0 open 5 · overdue 0`, cut to 28 cells; `plan` while it publishes none | Runs `/pb`, which opens the Plan pane (plan-board) |

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
  cc-band-pro only runs their commands, so each stays in, and is kept up in,
  its own plugin. A block whose plugin is off says so in a toast.
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

A press on a mod's block runs that mod's own command, as if typed, and the mod
opens its own pane. cc-band-pro draws only the Diff pane. Task runs `/rail pane`,
because a bare `/rail` toggles the folding of tool calls. Tree runs `/filetree open`,
because a bare `/filetree` closes the tree when it is already shown.

The command is called inside the press itself, not through a timer: the host
places a pane at any width only when the person's command or press is behind the
open, and below 144 columns a pane opened on its own waits undrawn. While Claude
is working, a press whose command waits for the turn is queued until the turn
ends, and a toast says so. Tree and Marks are the exception: their commands are
immediate, so they run at once mid-turn.

## Width

The band reads its own width () and cuts the task, studio, git,
inventory and plan segments to fit, widest first, none under 6 cells, so all
eight modules show at 122 columns. Each pill is a box that does not shrink, so a
squeezed row never wraps a pill down to a lone glyph.

## Files

- `hooks/register.tsx`: the hooks: band, diff recording, clicks.
- `hooks/targets.ts`: the command each block runs, and the one pane it draws.
- `hooks/bar.tsx`: the colors, icons, blocks and the powerline drawing.
- `hooks/diff.tsx`: the line diff and the Diff pane.
- `types/index.d.ts`: the state contract.

MIT licensed.
