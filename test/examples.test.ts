import { createShortcuts } from '../src/index'
import { mountBasicShortcuts } from '../examples/basic-usage'
import { beginShortcutCapture } from '../examples/record-shortcut'
import { mountEditorShortcuts } from '../examples/scopes-and-when'
import { mountNavigationShortcuts } from '../examples/sequences'

function keydown(target: EventTarget, init: KeyboardEventInit & { key: string }): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function withPlatform<T>(platform: string, run: () => T): T {
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'platform')
  Object.defineProperty(navigator, 'platform', {
    configurable: true,
    value: platform,
  })
  try {
    return run()
  } finally {
    if (descriptor) {
      Object.defineProperty(navigator, 'platform', descriptor)
    } else {
      delete (navigator as Navigator & { platform?: string }).platform
    }
  }
}

describe('documentation examples', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('demonstrates the basic combo example', () => {
    withPlatform('MacIntel', () => {
      const host = document.createElement('div')
      document.body.appendChild(host)

      const calls: string[] = []
      const shortcuts = mountBasicShortcuts(host, {
        openPalette: () => calls.push('palette'),
        closeSurface: () => calls.push('close'),
      })

      const paletteEvent = keydown(host, { key: 'k', metaKey: true, code: 'KeyK' })
      expect(calls).toEqual(['palette'])
      expect(paletteEvent.defaultPrevented).toBe(true)

      keydown(host, { key: 'Escape', code: 'Escape' })
      expect(calls).toEqual(['palette', 'close'])

      shortcuts.dispose()
    })
  })

  it('demonstrates scopes and when clauses', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const state = {
      modalOpen: false,
      hasSelection: false,
      readOnly: false,
    }
    const calls: string[] = []
    const { shortcuts, syncState } = mountEditorShortcuts(host, state, {
      closeEditor: () => calls.push('editor'),
      closeModal: () => calls.push('modal'),
      copySelection: () => calls.push('copy'),
    })

    keydown(host, { key: 'Escape', code: 'Escape' })
    expect(calls).toEqual(['editor'])

    keydown(host, { key: 'c', code: 'KeyC' })
    expect(calls).toEqual(['editor'])

    syncState({ hasSelection: true })
    keydown(host, { key: 'c', code: 'KeyC' })
    expect(calls).toEqual(['editor', 'copy'])

    syncState({ modalOpen: true })
    keydown(host, { key: 'Escape', code: 'Escape' })
    expect(calls).toEqual(['editor', 'copy', 'modal'])

    syncState({ readOnly: true })
    keydown(host, { key: 'c', code: 'KeyC' })
    expect(calls).toEqual(['editor', 'copy', 'modal'])

    shortcuts.dispose()
  })

  it('demonstrates sequence bindings', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const calls: string[] = []
    const shortcuts = mountNavigationShortcuts(host, {
      goHome: () => calls.push('home'),
      goIssues: () => calls.push('issues'),
      focusList: () => calls.push('list'),
    })

    keydown(host, { key: 'g', code: 'KeyG' })
    keydown(host, { key: 'h', code: 'KeyH' })
    keydown(host, { key: 'g', code: 'KeyG' })
    keydown(host, { key: 'g', code: 'KeyG' })

    expect(calls).toEqual(['home', 'list'])
    shortcuts.dispose()
  })

  it('demonstrates shortcut recording', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const previews: string[] = []
    const saved: string[] = []
    const shortcuts = createShortcuts({ target: host, sequenceTimeout: 20 })
    const session = beginShortcutCapture(shortcuts, {
      preview: (expression) => previews.push(expression),
      save: (recording) => saved.push(recording.expression),
    })

    keydown(host, { key: 'k', code: 'KeyK', ctrlKey: true })
    keydown(host, { key: 'c', code: 'KeyC' })

    await expect(session.finished).resolves.toMatchObject({
      expression: 'Ctrl+k c',
    })
    expect(previews).toEqual(['Ctrl+k', 'Ctrl+k c'])
    expect(saved).toEqual(['Ctrl+k c'])

    shortcuts.dispose()
  })
})
