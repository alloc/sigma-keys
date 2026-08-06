import { blocklistEntry } from '../blocklistEntry'

const combos = [
  ['Control+Tab', 'mac'],
  ['Control+Shift+Tab', 'mac'],
  ['Shift+Meta+[', 'mac'],
  ['Shift+Meta+]', 'mac'],
  ['Meta+[', 'mac'],
  ['Meta+]', 'mac'],
  ['Shift+Meta+\\', 'mac'],
] as const

export const safariBrowserShortcuts = combos.map(([combo, platform]) =>
  blocklistEntry(combo, { category: 'browser', browser: 'safari', platform }),
)
