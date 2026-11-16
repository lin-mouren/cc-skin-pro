import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { DiffStep } from '../types'
import { barPills, drawPowerline } from './bar'
import type { BarPress } from './bar'
import { DIFF_PANE, diffLines, drawDiff, isEditTool } from './diff'
import { paneOf, targetOf } from './targets'
import type { Pane, Target } from './targets'

const diffStepsAtom = atom({ plugin: 'cc-band-pro', key: 'diffSteps' } as const, [] as DiffStep[])
const diffIndexAtom = atom({ plugin: 'cc-band-pro', key: 'diffIndex' } as const, 0)

/** The edits this turn has made so far; they become the diff pane's steps when it ends. */
let pendingDiffs: DiffStep[] = []

/**
 * Runs another plugin's command inside the press, so the pane it opens counts as
 * the person's own (placed at any width, not held back below 144 columns). A timer
 * would drop the press behind the call. A command waits its turn while Claude
 * works unless its plugin made it immediate. A plugin that is off says so.
 */
const runCommand = ($: EngineInterface, target: Target) => {
  $.command.run({ command: target.command, args: target.args }).catch((error: unknown) => {
    const why = error instanceof Error ? error.message : String(error)
    $.ui.toast(`/${target.command} did not run (is ${target.plugin} on?): ${why}`)
  })
}

/** Opens the diff pane on the last turn's edits, at the first step; a surface that cannot seat it says so in a toast. */
const openDiff = async ($: EngineInterface, pane: Pane): Promise<void> => {
  void update($, diffIndexAtom, () => 0)
  const opened = await $.ui.open(pane)
  if (!opened.isPlaced) {
    $.ui.toast(`Diff pane is waiting: ${opened.reason}`)
  }
}

/**
 * What a press on the bar does: the diff opens here at once; every other press
 * runs its mod's command, which opens the mod's own pane. A command waits for the
 * turn to end, as one run from a hook does, so a press while Claude works says
 * it is queued, unless the command is immediate and runs mid-turn.
 */
export const onBarPress = ($: EngineInterface, press: BarPress, isWorking: boolean) => {
  const pane = paneOf(press)
  if (pane !== undefined) {
    void openDiff($, pane).catch(() => undefined)

    return
  }
  const target = targetOf(press)
  if (target === undefined) {
    return
  }
  if (isWorking && target.immediate !== true) {
    $.ui.toast(`/${target.command} queued: it opens when this turn ends`)
  }
  runCommand($, target)
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

/**
 * A mod's segment as text, or '' when the read fails (the mod is absent) or the
 * value is not a string: the band then leaves that module out. The read is
 * passed in as a thunk, so each call site keeps its plugin and key as literals.
 */
const segmentOf = async (load: () => Promise<unknown>): Promise<string> => {
  try {
    const text = await load()

    return typeof text === 'string' ? text : ''
  } catch {
    return ''
  }
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
    // The mods' segments, read while the band draws so it follows them: task-rail's status, product-studio's summary,
    // git-board's branch line, inventory-pane's counts and plan-board's open items.
    const pills = barPills((await read($, diffStepsAtom)).length, {
      rail: await segmentOf(() => read($, { plugin: 'task-rail', key: 'segment' })),
      studio: await segmentOf(() => read($, { plugin: 'product-studio', key: 'segment' })),
      git: await segmentOf(() => read($, { plugin: 'git-board', key: 'segment' })),
      inv: await segmentOf(() => read($, { plugin: 'inventory-pane', key: 'segment' })),
      plan: await segmentOf(() => read($, { plugin: 'plan-board', key: 'segment' })),
    }, e.props.bodyColumns)

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
