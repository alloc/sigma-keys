import { blocklistEntry } from '../blocklistEntry'

const combos = [
  'Meta+L',
  'Meta+Tab',
  'Alt+Tab',
  'Alt+F4',
  'Meta+D',
  'Meta+E',
  'Meta+R',
  'Meta+Space',
  'Ctrl+Alt+Delete',
]

export const windowsOsShortcuts = combos.map((combo) =>
  blocklistEntry(combo, { category: 'os', platform: 'windows' }),
)
