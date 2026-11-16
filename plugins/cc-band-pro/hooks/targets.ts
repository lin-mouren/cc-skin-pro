import type { BarPress } from './bar'
import { DIFF_PANE } from './diff'

/** The one pane cc-band-pro draws itself: the Diff pane. */
export type Pane = { id: string; title: string; focus: true; closeOnEscape: true }

/**
 * What a press on a block runs: another plugin's own slash command, exactly as
 * if it were typed. The mod's command opens its own pane, which its own plugin
 * draws. `immediate` marks a command its plugin runs mid-turn.
 */
export type Target = { command: string; args?: string; plugin: string; immediate?: true }

export type Press = Exclude<BarPress, 'diff'>

export const TARGETS: Readonly<Record<Press, Target>> = {
  // A bare /filetree closes the tree when it is shown; 'open' only opens it.
  tree: { command: 'filetree', args: 'open', plugin: 'filetree', immediate: true },
  mark: { command: 'bookmarks', plugin: 'transcript-bookmarks', immediate: true },
  // Bare /rail toggles the folding of tool calls, so the rail's command says 'pane' to open its side panel.
  rail: { command: 'rail', args: 'pane', plugin: 'task-rail' },
  studio: { command: 'studio', plugin: 'product-studio' },
  git: { command: 'gb', plugin: 'git-board' },
  inv: { command: 'inv', plugin: 'inventory-pane' },
  plan: { command: 'pb', plugin: 'plan-board' },
}

const DIFF_OWN_PANE: Pane = { id: DIFF_PANE, title: 'Diff', focus: true, closeOnEscape: true }

/** The pane a press opens in this plugin: the Diff press's only. */
export const paneOf = (press: BarPress): Pane | undefined => (press === 'diff' ? DIFF_OWN_PANE : undefined)

/** The command a press runs; the Diff press runs none. */
export const targetOf = (press: BarPress): Target | undefined => (press === 'diff' ? undefined : TARGETS[press])
