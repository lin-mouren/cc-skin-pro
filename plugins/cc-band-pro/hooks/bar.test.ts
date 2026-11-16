import { expect, test } from 'claude-code/testing'

import { barPills, cells } from './bar'
import type { Pill } from './bar'

const NONE = { rail: '', studio: '', git: '', inv: '', plan: '' }

const keys = (pills: readonly Pill[]): string[] => pills.map(pill => pill.key)
const textOf = (pills: readonly Pill[], key: string): string | undefined => pills.find(pill => pill.key === key)?.text

test('empty segments: git, inv and plan show their labels; task and studio are left out', async () => {
  const pills = barPills(0, NONE)

  expect(keys(pills)).toEqual(['diff', 'tree', 'mark', 'git', 'inv', 'plan'])
  expect(textOf(pills, 'git')).toBe('git')
  expect(textOf(pills, 'inv')).toBe('inv')
  expect(textOf(pills, 'plan')).toBe('plan')
})

test('present segments: git, inv and plan show their segment text', async () => {
  const pills = barPills(3, {
    rail: '',
    studio: '',
    git: '⎇ main · 3 reflog',
    inv: 'mem 4 · skill 12 · mod 7',
    plan: 'P0 open 5 · overdue 0',
  })

  expect(textOf(pills, 'git')).toBe('⎇ main · 3 reflog')
  expect(textOf(pills, 'inv')).toBe('mem 4 · skill 12 · mod 7')
  expect(textOf(pills, 'plan')).toBe('P0 open 5 · overdue 0')
})

test('a segment is collapsed to one line', async () => {
  const pills = barPills(0, { ...NONE, git: '  ⎇ main\n\t· 3 reflog  ' })

  expect(textOf(pills, 'git')).toBe('⎇ main · 3 reflog')
})

test('git, inv and plan are cut at 28 cells with an ellipsis', async () => {
  const long = 'release candidate build pipeline status now green'
  const pills = barPills(0, { ...NONE, git: long, inv: long, plan: long })

  for (const key of ['git', 'inv', 'plan']) {
    const text = textOf(pills, key) ?? ''
    expect(cells(text)).toBe(28)
    expect(text.endsWith('…')).toBe(true)
  }
})

test('a segment of exactly 28 cells is kept whole', async () => {
  const exact = 'a'.repeat(28)

  expect(textOf(barPills(0, { ...NONE, git: exact }), 'git')).toBe(exact)
})

test('rail and studio keep their caps, 28 and 36 cells', async () => {
  const pills = barPills(0, { ...NONE, rail: 'r'.repeat(40), studio: 'z'.repeat(50) })

  expect(cells(textOf(pills, 'rail') ?? '')).toBe(28)
  expect(cells(textOf(pills, 'studio') ?? '')).toBe(36)
})

test('a segment with no words draws no pill of its own: a lone glyph leaves the module out', async () => {
  const pills = barPills(0, { rail: '○', studio: '○', git: '○', inv: ' ○ ', plan: '·' })

  expect(keys(pills)).toEqual(['diff', 'tree', 'mark', 'git', 'inv', 'plan'])
  expect(textOf(pills, 'git')).toBe('git')
  expect(textOf(pills, 'inv')).toBe('inv')
  expect(textOf(pills, 'plan')).toBe('plan')
})

test('a glyph with words in the same segment is kept as text', async () => {
  const pills = barPills(0, { ...NONE, rail: '○ 2 open' })

  expect(textOf(pills, 'rail')).toBe('○ 2 open')
})
