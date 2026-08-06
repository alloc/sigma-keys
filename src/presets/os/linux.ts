import { blocklistEntry } from '../blocklistEntry'

const combos = [
  'Meta+L',
  'Alt+Tab',
  'Alt+F4',
  'Ctrl+Alt+Tab',
  'Ctrl+Alt+T',
  'Ctrl+Alt+ArrowLeft',
  'Ctrl+Alt+ArrowRight',
]

export const linuxOsShortcuts = combos.map((combo) =>
  blocklistEntry(combo, { category: 'os', platform: 'linux' }),
)
