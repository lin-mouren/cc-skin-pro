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
  }
}
