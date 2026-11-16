import type { BoxProps, ButtonProps, ElementConstructor, TextProps } from 'claude-code'

/** One block's colors: its background and the text drawn on it. */
export type Paint = { bg: string; fg: string }

/**
 * Catppuccin Mocha, as cc-skin-pro's skin of that name paints its bar: a
 * gradient, left to right, one step per block. The first three are that
 * gradient; the mods' modules after them take the next accents, in order.
 * Locked: no themes to pick.
 */
const BLOCKS: readonly Paint[] = [
  { bg: '#b4befe', fg: '#11111b' }, // lavender: diff
  { bg: '#89b4fa', fg: '#11111b' }, // blue: tree
  { bg: '#585b70', fg: '#cdd6f4' }, // surface2: marks
  { bg: '#74c7ec', fg: '#11111b' }, // sapphire: task
  { bg: '#94e2d5', fg: '#11111b' }, // teal: studio
  { bg: '#a6e3a1', fg: '#11111b' }, // green: git
  { bg: '#f9e2af', fg: '#11111b' }, // yellow: inventory
  { bg: '#cba6f7', fg: '#11111b' }, // mauve: plan
]

/** Powerline separators (Nerd Fonts): a round cap to open, an arrow between blocks, a round cap to close. */
const POWERLINE = { open: '', arrow: '', close: '' }

/** Nerd Font icons, at code points every Nerd Font shares. */
const ICONS = { diff: '', tree: '', bookmark: '' } as const

/** The icons as the words a button's label uses, where a surface draws labels (Desktop, VS Code). */
const ICON_WORDS: Readonly<Record<string, string>> = { [ICONS.diff]: '±' }

/** What a press on a block runs; the diff block opens the Diff pane, the others their mods' panes. */
export type BarPress = 'diff' | 'tree' | 'mark' | 'rail' | 'studio' | 'git' | 'inv' | 'plan'

export type Pill = {
  key: string
  text: string
  paint: Paint
  press: BarPress
}

/** Code points a terminal draws two cells wide: East Asian wide and fullwidth forms, emoji. */
const WIDE: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f], [0x2e80, 0x303e], [0x3041, 0x33ff], [0x3400, 0x4dbf], [0x4e00, 0x9fff], [0xa000, 0xa4cf],
  [0xac00, 0xd7a3], [0xf900, 0xfaff], [0xfe30, 0xfe6f], [0xff00, 0xff60], [0xffe0, 0xffe6], [0x1f300, 0x1f64f],
  [0x1f680, 0x1f6ff], [0x1f900, 0x1f9ff], [0x20000, 0x3fffd],
]
const ZERO_WIDTH = /[\p{M}\p{Cf}]/u

const charCells = (char: string): number => {
  if (ZERO_WIDTH.test(char)) {
    return 0
  }
  const code = char.codePointAt(0) ?? 0

  return WIDE.some(([from, to]) => code >= from && code <= to) ? 2 : 1
}

/** Terminal cells, not code points: a wide character takes two, a combining mark none. */
export const cells = (text: string): number => [...text].reduce((sum, char) => sum + charCells(char), 0)

/** Cells a mod's segment may take on the band: the task's status, the studio's summary. */
const RAIL_CELLS = 28
const STUDIO_CELLS = 36
/** Cells the git, inventory and plan segments may take. */
const MODULE_CELLS = 28

/** The mods' segment texts as the band reads them: '' where a mod is absent or publishes none. */
export type Segments = { rail: string; studio: string; git: string; inv: string; plan: string }

/** A segment's text as one line: whitespace collapsed, the ends trimmed. */
const oneLine = (text: string): string => text.replace(/\s+/g, ' ').trim()

/** The text cut to at most `width` cells; a cut ends in an ellipsis, which takes the last cell. */
const clip = (text: string, width: number): string => {
  if (cells(text) <= width) {
    return text
  }
  let out = ''
  let used = 0
  for (const char of text) {
    const size = cells(char)
    if (used + size > width - 1) {
      break
    }
    out += char
    used += size
  }

  return `${out}…`
}

/**
 * A mod's segment as one line, cut to `width`, or '' when it carries no letter
 * or digit: a glyph alone (a status dot, an idle mark) is no label, and drawn
 * as a pill of its own it reads as a stray.
 */
const segmentText = (text: string, width: number): string => {
  const line = oneLine(text)

  return /[\p{L}\p{N}]/u.test(line) ? clip(line, width) : ''
}

/**
 * The band's modules, left to right: the diff with its edit count, the tree and
 * the marks, then the mods' modules. The task and studio modules are left out
 * while their segment is empty; git, inventory and plan show their own label
 * instead, so the module stays visible while its mod publishes no text.
 */
export const barPills = (diffCount: number, segments: Segments): Pill[] => {
  const blocks: Omit<Pill, 'paint'>[] = [
    { key: 'diff', text: `${ICONS.diff} diff${diffCount > 0 ? ` ${diffCount}` : ''}`, press: 'diff' },
    { key: 'tree', text: `${ICONS.tree} tree`, press: 'tree' },
    { key: 'mark', text: `${ICONS.bookmark} marks`, press: 'mark' },
    { key: 'rail', text: segmentText(segments.rail, RAIL_CELLS), press: 'rail' },
    { key: 'studio', text: segmentText(segments.studio, STUDIO_CELLS), press: 'studio' },
    { key: 'git', text: segmentText(segments.git, MODULE_CELLS) || 'git', press: 'git' },
    { key: 'inv', text: segmentText(segments.inv, MODULE_CELLS) || 'inv', press: 'inv' },
    { key: 'plan', text: segmentText(segments.plan, MODULE_CELLS) || 'plan', press: 'plan' },
  ]

  return blocks.filter(block => block.text !== '').map((block, index) => ({ ...block, paint: BLOCKS[index]! }))
}

/**
 * A block's text as a button's label: Claude Desktop and VS Code draw a button
 * by its label, not the colored text inside it. Icons become words, any other
 * private-use glyph goes, spaces collapse.
 */
const plainLabel = (text: string): string =>
  [...text]
    .map(char => ICON_WORDS[char] ?? (/[-]/u.test(char) ? '' : char))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

/** The elements every surface's table carries; `Button` where a block is pressable. */
export type Elements = {
  Box: ElementConstructor<BoxProps>
  Text: ElementConstructor<TextProps>
  Button?: ElementConstructor<ButtonProps>
}

/**
 * Draws the blocks as a powerline: a round cap, each block on its own
 * background, an arrow in the left block's color over the right one's, a
 * round cap to end. A block is a button (a click, or Enter while the band
 * holds the focus) where the surface draws buttons.
 */
export const drawPowerline = ({ Box, Text, Button }: Elements, pills: readonly Pill[], onPress: (press: BarPress) => void) => {
  const first = pills[0]

  return (
    <Box flexDirection="row" flexWrap="nowrap" overflow="hidden">
      {first !== undefined && (
        <Text key="open" color={first.paint.bg}>
          {POWERLINE.open}
        </Text>
      )}
      {pills.flatMap((pill, index) => {
        const following = pills[index + 1]
        const face =
          Button !== undefined ? (
            <Button key={`${pill.key}-button`} label={plainLabel(pill.text) || pill.press} plain onPress={() => onPress(pill.press)}>
              <Text backgroundColor={pill.paint.bg} color={pill.paint.fg}>
                {` ${pill.text} `}
              </Text>
            </Button>
          ) : (
            <Text key={pill.key} backgroundColor={pill.paint.bg} color={pill.paint.fg}>
              {` ${pill.text} `}
            </Text>
          )

        return [
          face,
          <Text key={`${pill.key}-edge`} color={pill.paint.bg} backgroundColor={following?.paint.bg}>
            {following === undefined ? POWERLINE.close : POWERLINE.arrow}
          </Text>,
        ]
      })}
    </Box>
  )
}
