/** One line of an edit's diff: kept (' '), added, removed, or '~' for context left out. */
export type DiffLine = { op: '+' | '-' | ' ' | '~'; t: string }

/** One file edit of the last turn, as the diff pane shows it. */
export type DiffStep = { tool: string; file: string; diff: DiffLine[]; note: string }

declare module 'claude-code' {
  interface PluginState {
    'cc-band-pro': {
      /** The last turn's file edits: the diff block counts them, the diff pane walks them. */
      diffSteps: DiffStep[]
      /** The step the diff pane shows. */
      diffIndex: number
    }
    // Read-only, owned by each mod: the one-line text it publishes for its band module.
    // A mod that is absent, or that has published none, reads as nothing: task-rail and product-studio leave their
    // module out; git-board, inventory-pane and plan-board show their label (git, inv, plan) instead.
    'task-rail': { segment: string }
    'product-studio': { segment: string }
    'git-board': { segment: string }
    'inventory-pane': { segment: string }
    'plan-board': { segment: string }
  }
}
