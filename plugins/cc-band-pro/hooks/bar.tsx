import type { BoxProps, ButtonProps, ElementConstructor, TextProps } from 'claude-code'

/** One block's colors: its background and the text drawn on it. */
export type Paint = { bg: string; fg: string }

/**
 * Catppuccin Mocha, as cc-skin-pro's skin of that name paints its bar: a
 * gradient, left to right, one step per block. Locked: no themes to pick.
 */
const BLOCKS: readonly Paint[] = [
  { bg: '#b4befe', fg: '#11111b' }, // lavender: diff
  { bg: '#89b4fa', fg: '#11111b' }, // blue: tree
  { bg: '#585b70', fg: '#cdd6f4' }, // surface2: marks
]

/** Powerline separators (Nerd Fonts): a round cap to open, an arrow between blocks, a round cap to close. */
const POWERLINE = { open: '', arrow: '', close: '' }

/** Nerd Font icons, at code points every Nerd Font shares. */
const ICONS = { diff: '', tree: '', bookmark: '' } as const

/** The icons as the words a button's label uses, where a surface draws labels (Desktop, VS Code). */
const ICON_WORDS: Readonly<Record<string, string>> = { [ICONS.diff]: '±' }

/** What a press on a block runs; the diff block opens the Diff pane, the others their plugins' panes. */
export type BarPress = 'diff' | 'tree' | 'mark'

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

/** The three blocks: the diff with its edit count, the tree and the marks. */
export const barPills = (diffCount: number): Pill[] => {
  const blocks: Omit<Pill, 'paint'>[] = [
    { key: 'diff', text: `${ICONS.diff} diff${diffCount > 0 ? ` ${diffCount}` : ''}`, press: 'diff' },
    { key: 'tree', text: `${ICONS.tree} tree`, press: 'tree' },
    { key: 'mark', text: `${ICONS.bookmark} marks`, press: 'mark' },
  ]

  return blocks.map((block, index) => ({ ...block, paint: BLOCKS[index]! }))
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
