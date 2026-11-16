# cc-band-pro

cc-skin-pro's powerline bar, and nothing else, locked to Catppuccin Mocha. No
themes, no picker, no settings: one band above the prompt, three blocks, each a
click away from the plugin that owns its pane.

```
  diff 3   tree    marks
```

| Block | Shows | A click |
| --- | --- | --- |
| Diff | How many Edit, MultiEdit and Write calls the last turn made | Opens cc-band-pro's own Diff pane: step through each edit, `p`/`n`, Esc closes |
| Tree | `tree` | Runs `/filetree` |
| Marks | A bookmark icon | Opens the Bookmarks pane (the `transcript-bookmarks` plugin) |

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

## How it lives with the other bands

The prompt has one band slot, shared by every plugin that draws there. cc-band-pro
draws its bar and keeps whatever the plugins beneath it draw (`next(e)`), so the
skins mod's usage band and the rest stay where they were.

- Installed after skins, the skins band sits on top and this bar under it.
- A plugin above it in the chain that answers the band alone, as smart-compact
  does while it offers a compact, hides it until that offer is gone.
- Turn cc-skin-pro off: it draws the same bar, and two would stack.

## Clicks while Claude works

Every pane opens at once, mid-turn or not, and no press leaves a line in the
conversation. The Diff pane is cc-band-pro's own. The other two are opened by
their ids, which works because each plugin keeps the state its pane draws from:
filetree keeps its tree following the cwd, and transcript-bookmarks keeps its
list from `$.store` at session start. When a pane's render hook does not answer,
or the layout cannot hold it (filetree wants the fullscreen layout at 110 columns
or more), the block falls back to the plugin's command, and a command run from a
plugin waits for the turn to end, so that press is queued and a toast says so.

Typing `/filetree` yourself still opens it mid-turn, as that plugin allows.

## Files

- `hooks/register.tsx`: the hooks: band, diff recording, clicks.
- `hooks/bar.tsx`: the colors, icons, blocks and the powerline drawing.
- `hooks/diff.tsx`: the line diff and the Diff pane.
- `types/index.d.ts`: the state contract.

MIT licensed.
