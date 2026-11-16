import { expect, test } from 'claude-code/testing'

import { DIFF_PANE } from './diff'
import { paneOf, targetOf } from './targets'
import type { Press } from './targets'

const OTHER_PRESSES: readonly Press[] = ['tree', 'mark', 'rail', 'studio', 'git', 'inv', 'plan']

test("only the Diff press opens cc-band-pro's own pane; every other press has no pane and runs its mod's command", async () => {
  expect(paneOf('diff')?.id).toBe(DIFF_PANE)
  expect(targetOf('diff')).toBeUndefined()
  for (const press of OTHER_PRESSES) {
    expect(paneOf(press)).toBeUndefined()
    expect(targetOf(press)).not.toBeUndefined()
  }
})

test('each block runs its own mod command, with the argument that opens its pane', async () => {
  expect(targetOf('tree')).toEqual({ command: 'filetree', args: 'open', plugin: 'filetree', immediate: true })
  expect(targetOf('mark')).toEqual({ command: 'bookmarks', plugin: 'transcript-bookmarks', immediate: true })
  expect(targetOf('rail')).toEqual({ command: 'rail', args: 'pane', plugin: 'task-rail' })
  expect(targetOf('studio')).toEqual({ command: 'studio', plugin: 'product-studio' })
  expect(targetOf('git')).toEqual({ command: 'gb', plugin: 'git-board' })
  expect(targetOf('inv')).toEqual({ command: 'inv', plugin: 'inventory-pane' })
  expect(targetOf('plan')).toEqual({ command: 'pb', plugin: 'plan-board' })
})
