import { expect, test } from 'claude-code/testing'

import { onBarPress } from './register'

/** A stand-in for the engine handle: records what a press does, and where. */
const fake = () => {
  const log: string[] = []
  const $ = {
    clock: { after: (_ms: number, _fn: () => void) => void log.push('clock.after') },
    command: {
      run: (input: { command: string; args?: string }) => {
        log.push(`run:${input.command}${input.args === undefined ? '' : ` ${input.args}`}`)

        return Promise.resolve({ output: '' })
      },
    },
    ui: { toast: (text: string) => void log.push(`toast:${text}`), open: () => Promise.resolve({ isPlaced: true }) },
  }

  return { $: $ as never, log }
}

test("a press runs the mod's command inside the press, not through a timer that drops the press", async () => {
  const { $, log } = fake()
  onBarPress($, 'git', false)

  expect(log).toEqual(['run:gb'])
})

test('a press keeps the command args', async () => {
  const { $, log } = fake()
  onBarPress($, 'rail', false)
  onBarPress($, 'tree', false)

  expect(log).toEqual(['run:rail pane', 'run:filetree open'])
})

test('a press while Claude works says it is queued, and still runs the command in the press', async () => {
  const { $, log } = fake()
  onBarPress($, 'plan', true)
  onBarPress($, 'mark', true)

  expect(log).toEqual(['toast:/pb queued: it opens when this turn ends', 'run:pb', 'run:bookmarks'])
})
