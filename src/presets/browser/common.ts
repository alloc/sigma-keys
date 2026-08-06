import { blocklistEntry } from '../blocklistEntry'

const combos = [
  'Mod+N',
  'Mod+Shift+N',
  'Mod+T',
  'Mod+Shift+T',
  'Mod+W',
  'Mod+Shift+W',
  'Mod+L',
  'Mod+R',
  'Mod+Shift+R',
  'Mod+1',
  'Mod+2',
  'Mod+3',
  'Mod+4',
  'Mod+5',
  'Mod+6',
  'Mod+7',
  'Mod+8',
  'Mod+9',
]

export const commonBrowserShortcuts = combos.map((combo) =>
  blocklistEntry(combo, { category: 'browser' }),
)
