import {
  chromeBrowserShortcuts,
  commonBrowserShortcuts,
  edgeBrowserShortcuts,
  firefoxBrowserShortcuts,
  linuxOsShortcuts,
  macOsShortcuts,
  safariBrowserShortcuts,
  windowsOsShortcuts,
} from 'powerkeys'

describe('blocklist presets', () => {
  it('tags common and browser-specific entries with their source metadata', () => {
    expect(commonBrowserShortcuts.length).toBeGreaterThan(0)
    expect(commonBrowserShortcuts.every((entry) => entry.category === 'browser')).toBe(true)
    expect(chromeBrowserShortcuts.every((entry) => entry.browser === 'chrome')).toBe(true)
    expect(edgeBrowserShortcuts.every((entry) => entry.browser === 'edge')).toBe(true)
    expect(firefoxBrowserShortcuts.every((entry) => entry.browser === 'firefox')).toBe(true)
    expect(safariBrowserShortcuts.every((entry) => entry.browser === 'safari')).toBe(true)
  })

  it('tags operating-system presets by platform', () => {
    expect(
      macOsShortcuts.every((entry) => entry.category === 'os' && entry.platform === 'mac'),
    ).toBe(true)
    expect(
      windowsOsShortcuts.every((entry) => entry.category === 'os' && entry.platform === 'windows'),
    ).toBe(true)
    expect(
      linuxOsShortcuts.every((entry) => entry.category === 'os' && entry.platform === 'linux'),
    ).toBe(true)
  })
})
