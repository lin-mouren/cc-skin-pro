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
    // Read-only, owned by task-rail and product-studio: the one-line text each publishes for its band module.
    // A mod that is absent, or that has published none, reads as nothing and its module is left out.
    'task-rail': { segment: string }
    'product-studio': { segment: string }
  }
}
