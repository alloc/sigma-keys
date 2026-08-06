# powerkeys

## Purpose

`powerkeys` brings VS Code-style keyboard shortcuts to modern web apps. It handles
scoped bindings, multi-step sequences, `when` clauses, editable-target policies,
shortcut recording, atomic rebinding through binding sets, pre-dispatch
candidate guards, blocklist validation, and external availability checks in one
small runtime.

## Installation

```sh
pnpm add powerkeys
```

## Quick Example

```ts
import { createShortcuts } from 'powerkeys'

const shortcuts = createShortcuts({ target: document })

shortcuts.bind({
  combo: 'Mod+k',
  preventDefault: true,
  handler: () => {
    openCommandPalette()
  },
})

// Use the same syntax for a shortcut limited to an element subtree.
const editorElement = document.querySelector<HTMLElement>('#editor')!
shortcuts.bindWithin(editorElement, 'Mod+Enter', () => submitEditor())
```

For user-configurable shortcuts, a runtime can also carry browser and operating
system reservations. Browser entries attempt to prevent matching native defaults;
OS entries are available to validation but cannot be intercepted by page
JavaScript.

```ts
import { commonBrowserShortcuts, createShortcuts } from 'powerkeys'

const shortcuts = createShortcuts({
  target: document,
  blocklist: commonBrowserShortcuts,
})

const result = shortcuts.validateShortcut('Mod+w')
if (!result.valid) {
  // Map result.errors to app-owned UI copy or policy.
}
```

## Documentation Map

- Conceptual guide: [docs/context.md](docs/context.md)
- Runnable examples: [examples/basic-usage.ts](examples/basic-usage.ts),
  [examples/customizable-shortcuts.ts](examples/customizable-shortcuts.ts),
  [examples/command-availability.ts](examples/command-availability.ts),
  [examples/scopes-and-when.ts](examples/scopes-and-when.ts),
  [examples/sequences.ts](examples/sequences.ts),
  [examples/record-shortcut.ts](examples/record-shortcut.ts)
- Exact exported signatures: [dist/index.d.mts](dist/index.d.mts)
- Interactive demo: [demo/src/App.tsx](demo/src/App.tsx)
