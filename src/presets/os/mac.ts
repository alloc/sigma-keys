import { blocklistEntry } from '../blocklistEntry'

const combos = [
  'Meta+Tab',
  'Meta+Space',
  'Meta+Option+Space',
  'Control+ArrowLeft',
  'Control+ArrowRight',
  'Control+Meta+Q',
]

export const macOsShortcuts = combos.map((combo) =>
  blocklistEntry(combo, { category: 'os', platform: 'mac' }),
)
