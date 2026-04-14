import { createShortcuts, type RunnableInput, type ShortcutRuntime } from 'powerkeys'

export type EditorCommand = RunnableInput & {
  id: string
  title: string
  run(): void
}

export type CommandState = {
  modalOpen: boolean
  canRename: boolean
  readOnly: boolean
}

export function mountCommandAvailability(
  target: HTMLElement,
  state: CommandState,
  commands: {
    renameSymbol(): void
  },
): {
  shortcuts: ShortcutRuntime
  getPaletteCommands(): EditorCommand[]
  syncState(nextState: Partial<CommandState>): void
} {
  const shortcuts = createShortcuts({
    target,
    getActiveScopes: () => (state.modalOpen ? ['modal', 'editor'] : ['editor']),
  })

  const paletteCommands: readonly EditorCommand[] = [
    {
      id: 'editor.renameSymbol',
      title: 'Rename Symbol',
      scope: 'editor',
      when: 'editor.canRename && !editor.readOnly',
      run: () => commands.renameSymbol(),
    },
  ]

  for (const command of paletteCommands) {
    shortcuts.bind({
      combo: 'F2',
      scope: command.scope,
      when: command.when,
      handler: command.run,
    })
  }

  const getPaletteCommands = (): EditorCommand[] =>
    paletteCommands.filter((command) => shortcuts.isAvailable(command))

  const syncState = (nextState: Partial<CommandState>): void => {
    Object.assign(state, nextState)
    shortcuts.batchContext({
      'editor.canRename': state.canRename,
      'editor.readOnly': state.readOnly,
    })
  }

  syncState(state)
  return { shortcuts, getPaletteCommands, syncState }
}
