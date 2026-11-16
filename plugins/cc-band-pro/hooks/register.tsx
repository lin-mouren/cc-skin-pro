import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { DiffStep } from '../types'
import { barPills, drawPowerline } from './bar'
import type { BarPress } from './bar'
import { DIFF_PANE, diffLines, drawDiff, isEditTool } from './diff'

const diffStepsAtom = atom({ plugin: 'cc-band-pro', key: 'diffSteps' } as const, [] as DiffStep[])
const diffIndexAtom = atom({ plugin: 'cc-band-pro', key: 'diffIndex' } as const, 0)

/**
 * What a press on a block runs: another plugin's own slash command, exactly as
 * if it were typed, so each pane is kept in its own plugin. The diff block is
 * the one that opens this plugin's own pane.
 */
type Pane = { id: string; title: string | ((cwd: string) => string); focus?: boolean; closeOnEscape?: boolean }
type Target = { command: string; plugin: string; pane?: Pane }
const TARGETS: Readonly<Record<Exclude<BarPress, 'diff'>, Target>> = {
  // Each of these keeps the state its pane draws from, so opening it by its id
  // comes up whole without the command: filetree keeps its tree following the
  // cwd, and transcript-bookmarks its list from $.store at session.start.
  tree: {
    command: 'filetree',
    plugin: 'filetree',
    pane: { id: 'filetree', title: cwd => `Files: ${cwd.split('/').pop() || cwd}`, focus: true },
  },
  mark: {
    command: 'bookmarks',
    plugin: 'transcript-bookmarks',
    pane: { id: 'bookmarks', title: 'Bookmarks', focus: true, closeOnEscape: true },
  },
}

/** The edits this turn has made so far; they become the diff pane's steps when it ends. */
let pendingDiffs: DiffStep[] = []

/**
 * Runs another plugin's command on a timer, in a dispatch of its own: work a
 * press starts ends with the press, and a command waits its turn while Claude
 * works unless its plugin made it immediate. A plugin that is off says so.
 */
const runCommand = ($: EngineInterface, target: Target) => {
  $.clock.after(1, () =>
    $.command.run({ command: target.command }).catch((error: unknown) => {
      const why = error instanceof Error ? error.message : String(error)
      $.ui.toast(`/${target.command} did not run (is ${target.plugin} on?): ${why}`)
    }),
  )
}

/** Opens the diff pane on the last turn's edits, at the first step; a surface that cannot seat it says so in a toast. */
const openDiff = async ($: EngineInterface): Promise<void> => {
  void update($, diffIndexAtom, () => 0)
  const opened = await $.ui.open({ id: DIFF_PANE, title: 'Diff', focus: true, closeOnEscape: true })
  if (!opened.isPlaced) {
    $.ui.toast(`Diff pane is waiting: ${opened.reason}`)
  }
}

/** Opens another plugin's pane by its id, mid-turn, when its own render hook answers it. */
const openPaneNow = async ($: EngineInterface, target: Target): Promise<boolean> => {
  const pane = target.pane
  if (pane === undefined) {
    return false
  }
  const { id, focus, closeOnEscape } = pane
  const title = typeof pane.title === 'string' ? pane.title : pane.title(await $.session.cwd().catch(() => ''))
  const opened = await $.ui.open({ id, title, focus, closeOnEscape }).catch(() => undefined)

  return opened?.isPlaced === true
}

/**
 * What a press on the bar does: the diff opens here at once, the rest run their
 * own plugins' commands. A pane that draws from state its plugin already keeps
 * opens straight away and leaves no line in the conversation, mid-turn or not;
 * the other commands wait for the turn to end, as one run from a hook does, so a
 * press while Claude works says it is queued.
 */
const onBarPress = ($: EngineInterface, press: BarPress, isWorking: boolean) => {
  if (press === 'diff') {
    void openDiff($).catch(() => undefined)

    return
  }
  const target = TARGETS[press]
  void openPaneNow($, target).then(now => {
    if (now) {
      return
    }
    if (isWorking) {
      $.ui.toast(`/${target.command} queued: it opens when this turn ends`)
    }
    runCommand($, target)
  })
}

/** A path under the session's folder as relative to it; any other as it is. */
const relPath = (cwd: string, path: unknown): string => {
  const full = typeof path === 'string' ? path : ''
  if (full === '') {
    return '(unknown file)'
  }

  return cwd !== '' && full.startsWith(`${cwd}/`) ? full.slice(cwd.length + 1) : full
}

/**
 * The steps a tool call makes: one for an Edit or a Write, one per edit of a
 * MultiEdit. A Write reads the file as it stands before the tool runs, so it
 * diffs against what was there.
 */
const stepsFor = async ($: EngineInterface, e: Record<string, unknown>): Promise<DiffStep[]> => {
  const cwd = await $.session.cwd().catch(() => '')
  const file = relPath(cwd, e.file_path)

  if (e.tool === 'Edit') {
    return [{ tool: 'Edit', file, diff: diffLines(e.old_string, e.new_string), note: e.replace_all === true ? 'replace all' : '' }]
  }
  if (e.tool === 'MultiEdit' && Array.isArray(e.edits)) {
    const edits = e.edits as Array<{ old_string?: unknown; new_string?: unknown } | null>

    return edits.map((edit, k) => ({
      tool: 'MultiEdit',
      file,
      diff: diffLines(edit?.old_string, edit?.new_string),
      note: `edit ${k + 1} of ${edits.length}`,
    }))
  }
  if (e.tool === 'Write') {
    let before = ''
    let isNew = true
    try {
      const path = typeof e.file_path === 'string' ? e.file_path : ''
      if (path !== '' && (await $.fs.exists(path))) {
        const text: unknown = await $.fs.read(path)
        before = typeof text === 'string' ? text : ''
        isNew = false
      }
    } catch {
      // unreadable: show it as a new file
    }

    return [{ tool: 'Write', file, diff: diffLines(before, e.content), note: isNew ? 'new file' : 'rewrite' }]
  }

  return []
}

export const register: Register = on => {
  // A /clear or a resume ends this session: the host empties every plugin's $.state with it (the atoms included,
  // back to their defaults), so only the turn's edits, held in this module, are dropped here.
  on('session.end', async (_, e, next) => {
    if (e.reason === 'resume' || e.reason === 'clear') {
      pendingDiffs = []
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.start', async (_, e, next) => {
    if (e.agentId === undefined) {
      pendingDiffs = []
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // An edit is diffed before it runs (a Write against the file as it stands) and kept once it went through.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined || !isEditTool(e.tool)) {
      return next(e)
    }
    let steps: DiffStep[] = []
    try {
      steps = await stepsFor($, e as unknown as Record<string, unknown>)
    } catch {
      // Recording never stops the edit.
    }
    const result = await next(e)
    if (result.deny === undefined && result.isError !== true) {
      pendingDiffs = [...pendingDiffs, ...steps]
    }

    return result
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId !== undefined) {
      return next(e)
    }
    // The turn's edits become the diff pane's steps; a turn without edits leaves the last ones.
    const edits = pendingDiffs
    pendingDiffs = []
    if (edits.length > 0) {
      await update($, diffStepsAtom, () => edits)
      await update($, diffIndexAtom, () => 0)
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // The band: the bar on top of whatever the plugins beneath draw, so the skins band and the rest stay.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey) {
      return below
    }
    const elements = $.ui.resolve(e)
    const { Box } = elements
    const pills = barPills((await read($, diffStepsAtom)).length)

    return (
      <Box flexDirection="column">
        {drawPowerline(elements, pills, press => onBarPress($, press, e.props.isWorking))}
        {below}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: DIFF_PANE }, async ($, e) => {
    const steps = await read($, diffStepsAtom)

    return drawDiff(
      $.ui.resolve(e),
      {
        steps,
        index: await read($, diffIndexAtom),
        columns: e.props.bodyColumns,
        bodyRows: e.props.scroll.bodyRows,
      },
      {
        // clamped, so Next on the last step and Prev on the first stay put
        go: index => void update($, diffIndexAtom, () => Math.max(0, Math.min(index, steps.length - 1))),
        close: () => void $.ui.close({ id: DIFF_PANE }).catch(() => undefined),
      },
    )
  })
}
