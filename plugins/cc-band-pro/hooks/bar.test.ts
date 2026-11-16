import { expect, test } from 'claude-code/testing'

import { barPills, cells, drawPowerline } from './bar'
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

// Real producer shapes: task-rail's segment and a bare glyph.
const RAIL_REAL = '○ ▓▓░ 1/1 · 执行命令 · ✓7 ✗0'

test('real rail shape stays one whole pill; a bare glyph leaves none (no stray ○ pill)', async () => {
  const whole = barPills(0, { ...NONE, rail: RAIL_REAL })
  expect(textOf(whole, 'rail')).toBe(RAIL_REAL)
  const bare = barPills(0, { ...NONE, rail: '○' })
  expect(keys(bare)).not.toContain('rail')
  expect(bare.some(pill => pill.text.trim() === '○')).toBe(false)
})

/** What the band draws for a row of pills: open cap, then each pill with one cell of padding either side and one of edge. */
const bandCells = (pills: readonly Pill[]): number =>
  pills.length === 0 ? 0 : 1 + pills.reduce((sum, pill) => sum + cells(pill.text) + 3, 0)

const FULL = {
  rail: RAIL_REAL,
  studio: 'studio · 3 drafts · 2 launched · 1 review pending',
  git: '⎇ govops/2026-09-18-ci-coverage · 3 reflog',
  inv: 'mem 40 · skill 120 · mod 17 · hooks 9',
  plan: 'P0 open 15 · overdue 2 · next due 18:30',
}

test('all 8 modules fit in 122 columns once the band knows its width', async () => {
  const pills = barPills(12, FULL, 122)
  expect(keys(pills)).toEqual(['diff', 'tree', 'mark', 'rail', 'studio', 'git', 'inv', 'plan'])
  expect(bandCells(pills)).toBeLessThanOrEqual(122)
  for (const width of [100, 110, 122, 140, 200]) {
    expect(bandCells(barPills(12, FULL, width))).toBeLessThanOrEqual(width)
  }
})

test('narrow bands keep every module with at least its label', async () => {
  const pills = barPills(0, FULL, 100)
  expect(pills.length).toBe(8)
  expect(bandCells(pills)).toBeLessThanOrEqual(100)
})

test('wide bands keep the natural caps', async () => {
  const pills = barPills(0, FULL, 400)
  expect(cells(textOf(pills, 'studio') ?? '')).toBeLessThanOrEqual(36)
  expect(textOf(pills, 'rail')).toBe(RAIL_REAL)
})

test('every pill sits in a box that does not shrink: a squeezed pill would wrap to its first glyph, a stray ○', async () => {
  const stub = (name: string) => ((props: Record<string, unknown>) => ({ name, ...props })) as never
  const row = drawPowerline({ Box: stub('Box'), Text: stub('Text'), Button: stub('Button') }, barPills(0, FULL, 122), () => undefined) as unknown as {
    children: unknown
  }
  const nodes = [row.children].flat(3) as { name?: string; flexShrink?: number }[]
  expect(nodes.filter(node => node?.name === 'Box' && node.flexShrink === 0).length).toBe(8)
})
