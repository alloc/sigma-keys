import { blocklistEntry } from '../blocklistEntry'

const combos = [
  ['Ctrl+Tab', 'windows'],
  ['Ctrl+Shift+Tab', 'windows'],
  ['Ctrl+PageUp', 'windows'],
  ['Ctrl+PageDown', 'windows'],
  ['Alt+ArrowLeft', 'windows'],
  ['Alt+ArrowRight', 'windows'],
  ['Ctrl+Tab', 'linux'],
  ['Ctrl+Shift+Tab', 'linux'],
  ['Ctrl+PageUp', 'linux'],
  ['Ctrl+PageDown', 'linux'],
  ['Alt+ArrowLeft', 'linux'],
  ['Alt+ArrowRight', 'linux'],
  ['Meta+Alt+ArrowLeft', 'mac'],
  ['Meta+Alt+ArrowRight', 'mac'],
  ['Meta+[', 'mac'],
  ['Meta+]', 'mac'],
] as const

export const edgeBrowserShortcuts = combos.map(([combo, platform]) =>
  blocklistEntry(combo, { category: 'browser', browser: 'edge', platform }),
)
