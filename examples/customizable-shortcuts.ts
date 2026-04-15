import { createShortcuts, type BindingSpec, type ShortcutRuntime } from 'powerkeys'

export type UserShortcutState = {
  openPalette: string | null
  renameSymbol: string | null
}

export type UserShortcutActions = {
  openPalette(): void
  renameSymbol(): void
}

export function mountCustomizableShortcuts(
  target: HTMLElement,
  state: UserShortcutState,
  actions: UserShortcutActions,
): {
  shortcuts: ShortcutRuntime
  syncBindings(nextState: Partial<UserShortcutState>): void
} {
  const shortcuts = createShortcuts({ target })
  const userBindings = shortcuts.createBindingSet()

  const syncBindings = (nextState: Partial<UserShortcutState>): void => {
    Object.assign(state, nextState)

    const nextBindings: BindingSpec[] = []

    if (state.openPalette) {
      nextBindings.push(
        toBindingSpec(state.openPalette, {
          preventDefault: true,
          handler: () => actions.openPalette(),
        }),
      )
    }

    if (state.renameSymbol) {
      nextBindings.push(
        toBindingSpec(state.renameSymbol, {
          handler: () => actions.renameSymbol(),
        }),
      )
    }

    userBindings.replace(nextBindings)
  }

  syncBindings(state)
  return { shortcuts, syncBindings }
}

function toBindingSpec(
  expression: string,
  input: Omit<BindingSpec, 'combo' | 'sequence'>,
): BindingSpec {
  return expression.includes(' ')
    ? { ...input, sequence: expression }
    : { ...input, combo: expression }
}
