# Binding Sets and Transactional Rebinding

## Overview / Problem Statement

`powerkeys` currently exposes per-binding registration through `bind` and
`unbind`. That is sufficient for static shortcuts, but it is awkward for apps
that derive shortcuts from user settings, command metadata, or other dynamic
state.

The common downstream pattern is:

1. Track runtime-generated binding ids or `BindingHandle`s outside the runtime.
2. Unbind every previously derived binding.
3. Recompute the next binding list.
4. Bind the recomputed list.

This pattern has two problems:

- It forces application code to manage runtime bookkeeping that is not part of
  the app's command model.
- It is not transactional. If one new binding throws during `bind`, the runtime
  can be left partially updated or completely empty.

`powerkeys` should support this rebinding use case out of the box, but it
should do so without expanding into a command registry or command palette
framework.

This proposal adds a generic `BindingSet` abstraction to the runtime. A
`BindingSet` owns a mutable collection of bindings that can be replaced
atomically as one unit.

## Context

The existing library boundary is explicit:

- `powerkeys` owns keyboard matching, dispatch, recording, and shared
  availability checks.
- The application owns commands, menus, command ids, persistence, and
  presentation metadata.

This proposal preserves that boundary. The new API is generic over bindings and
does not introduce command ids, command registries, palette groups, or any
other app-level concepts.

## Goals

- Support safe replacement of a derived binding collection without requiring
  downstream code to track runtime-generated binding ids.
- Keep the new API generic over bindings rather than command-aware.
- Guarantee all-or-nothing replacement semantics when the next binding set is
  invalid.
- Preserve conflict-order stability relative to unrelated bindings when a
  binding set is replaced repeatedly.
- Keep the feature additive. Existing `bind` and `unbind` behavior must remain
  valid.

## Non-Goals

- Do not add a command registry, command id index, menu model, or command
  palette abstraction.
- Do not make binding ids stable across replacements.
- Do not infer bindings from command objects inside `powerkeys`.
- Do not add async replacement, persistence, or diff-based updates in the first
  version.
- Do not change winner selection rules other than making repeated replacements
  preserve a stable final tie-break position.

## Success Criteria

The proposal is successful if all of the following are true:

- A downstream app can replace all user-configurable bindings through one
  runtime-owned object.
- An invalid replacement attempt leaves the previous bindings fully active.
- Replacing one binding set does not silently change its tie-break precedence
  relative to unrelated direct bindings or other binding sets.
- The public API does not mention command ids, command metadata, or palette
  concepts.

## Assumptions and Constraints

- The runtime remains synchronous.
- Binding validation continues to happen during registration.
- Existing conflict resolution continues to prefer, in order:
  1. Higher `priority`
  2. Sequence bindings over combo bindings
  3. Longer sequences over shorter ones
  4. Earlier active scopes over later active scopes
  5. Later registration as the final tie-break
- No new runtime dependency is required.
- Existing direct `bind` usage must remain source-compatible.

## Terminology

- **Direct binding**
  - A binding registered through `ShortcutRuntime.bind`.

- **Binding spec**
  - A self-contained object-form binding definition with an inline `handler`.
  - In type terms, this proposal uses `BindingSpec`.

- **Binding set**
  - A runtime-owned mutable collection of bindings that can be replaced,
    cleared, or disposed as one unit.

- **Slot order**
  - A stable precedence position assigned to a direct binding or binding set.
  - Slot order is used as the last cross-owner tie-break after `priority`,
    binding kind, sequence length, and matched scope.

- **Entry order**
  - The order of bindings inside one binding set replacement call.
  - Entry order is used as the final tie-break within one binding set.

## Proposed Design

Add a new runtime method:

```ts
const userBindings = runtime.createBindingSet()
```

The returned `BindingSet` owns a dynamic collection of bindings. The app can
replace that collection as often as needed:

```ts
userBindings.replace([
  {
    combo: 'F2',
    scope: 'editor',
    when: 'editor.canRename && !editor.readOnly',
    handler: renameSymbol,
  },
])
```

The key behavior is transactional replacement:

- `replace` compiles and validates the entire next collection first.
- If any next entry is invalid, `replace` throws and the current collection
  remains unchanged.
- If validation succeeds, the runtime swaps the set contents in one synchronous
  commit.

This design intentionally stays below the command layer. A downstream app still
maps command ids, titles, user settings, and binding expressions in its own
model. `powerkeys` only manages the derived keyboard registrations.

## API / Interface Specification

### Public Types

```ts
export type BindingSpec = RunnableInput & {
  combo?: string
  sequence?: string
  keyEvent?: KeyEventType
  priority?: number
  editablePolicy?: 'inherit' | EditablePolicy
  preventDefault?: boolean
  stopPropagation?: boolean
  allowRepeat?: boolean
  handler: ShortcutHandler
}

export type BindingSet = {
  replace(next: readonly BindingSpec[]): void
  clear(): void
  getBindings(): readonly BindingSnapshot[]
  dispose(): void
}
```

### `ShortcutRuntime.createBindingSet()`

```ts
export type ShortcutRuntime = {
  createBindingSet(): BindingSet
}
```

Purpose:

- Create a mutable runtime-owned binding collection.

Inputs:

- No arguments in v1.

Outputs:

- Returns an empty `BindingSet` associated with the owning runtime.

Lifecycle:

- The binding set remains usable until either `BindingSet.dispose()` or
  `ShortcutRuntime.dispose()` is called.

Invariants:

- A binding belongs to exactly one owner: either a direct binding or one
  binding set.
- Each binding set receives one stable slot order at creation time and keeps it
  for its lifetime.

Failure behavior:

- Throws `TypeError('Shortcut runtime is disposed')` if the owning runtime is
  already disposed.

### `BindingSet.replace(next)`

Purpose:

- Replace the current set contents with `next`.

Inputs:

- `next` is a readonly array of `BindingSpec`.
- Each entry must use the object form and include `handler`.

Outputs:

- No return value.

Defaults:

- `next.length === 0` is valid and results in an empty set.

Lifecycle and ownership:

- The binding set continues to exist after replacement, even when it becomes
  empty.
- Replacement does not create a new binding set object.

Invariants:

- Replacement is all-or-nothing.
- Successful replacement assigns fresh binding ids to the new entries.
- The binding set keeps its stable slot order across replacements.
- Entry order inside `next` defines the binding order within the set.

Guarantees:

- If `replace` returns normally, every current binding in the set came from the
  supplied `next` array.
- If `replace` throws, the previous set contents remain active and observable
  through dispatch, `explain`, and `getBindings`.

Failure behavior:

- Throws the same synchronous errors that `bind` would throw for an invalid
  entry, including invalid `combo`, invalid `sequence`, missing `handler`, or
  invalid `when` syntax.
- Throws `TypeError('Binding set is disposed')` if the set has already been
  disposed.
- Throws `TypeError('Shortcut runtime is disposed')` if the owning runtime is
  disposed.

### `BindingSet.clear()`

Purpose:

- Remove all bindings currently owned by the set.

Behavior:

- Equivalent to `replace([])`.
- Preserves the binding set object and its stable slot order.

Failure behavior:

- Same disposal behavior as `replace`.

### `BindingSet.getBindings()`

Purpose:

- Inspect the current contents of one binding set for tests, debugging, and
  tooling.

Outputs:

- Returns the set's current bindings as `BindingSnapshot[]` in entry order.

Guarantees:

- Returns `[]` for an empty set.
- Returns `[]` after `BindingSet.dispose()` or `ShortcutRuntime.dispose()`.

Failure behavior:

- Does not throw after disposal. It returns the current observable state, which
  is empty once the set or runtime is disposed.

### `BindingSet.dispose()`

Purpose:

- Permanently retire the binding set and remove all current bindings it owns.

Behavior:

- Idempotent.
- Removes the set's current bindings.
- Releases all active sequence state owned by those bindings.
- Remains a no-op if the owning runtime has already been disposed.
- After disposal, `replace` and `clear` throw
  `TypeError('Binding set is disposed')`.

Outputs:

- No return value.

## Behavioral Semantics

### Registration and Replacement

`BindingSet.replace(next)` behaves as a synchronous transaction:

1. Validate that the binding set and runtime are not disposed.
2. Compile every entry in `next` into temporary binding records.
3. If compilation fails for any entry, abort and leave the current set
   unchanged.
4. If compilation succeeds, commit the next records as the set's new contents
   and drop any active sequence state owned by the previous contents.

No partially updated state is observable between steps 2 and 4.

### Binding Ids

- Binding ids generated for a binding set are runtime-generated and unstable.
- A successful replacement assigns fresh ids to every entry in `next`.
- Applications must not persist or key app-level data by these ids.

### Conflict Resolution and Stable Order

This proposal preserves the current winner-selection rules and refines the
final tie-break.

For otherwise identical candidates, the winner is selected by:

1. Higher `priority`
2. Sequence over combo
3. Longer sequence over shorter sequence
4. Earlier matched active scope
5. Later slot order
6. Later entry order within the same binding set

Implications:

- Direct bindings behave like single-entry owners with one slot order.
- A binding set keeps the same slot order across repeated replacements.
- Replacing one binding set does not move it ahead of or behind unrelated
  direct bindings or other binding sets in the final tie-break.
- Later entries inside one `replace` call still beat earlier entries in
  otherwise identical ties, matching today's insertion-order behavior.

### Interaction with `getBindings()`

- `BindingSet.getBindings()` returns only the current contents of that set in
  entry order.
- `ShortcutRuntime.getBindings()` continues to return all registered bindings in
  runtime precedence order.

This proposal requires updating the `ShortcutRuntime.getBindings()` docs to
describe that order as runtime precedence order rather than literal historical
insertion time, because binding sets preserve a stable slot across replacement.

### Interaction with Sequences

- When a binding set is successfully replaced or disposed, any active sequence
  state owned by its previous bindings is dropped.
- Ongoing recording sessions are unaffected because recording state is separate
  from registered bindings.

This intentionally favors correctness and simple semantics over attempting to
preserve in-progress sequences across rebinding.

### Interaction with Pause, Context, and Availability

- `pause`, `resume`, runtime context, and `isAvailable` semantics do not change.
- Binding sets only affect registration ownership and replacement behavior.
- A binding set does not create a new scope or a new availability surface.

## Architecture / Data Flow

### Public Model

- Apps keep command models, user settings, and resolved binding expressions.
- Apps convert those resolved expressions into `BindingSpec[]`.
- Apps call `BindingSet.replace(next)` whenever the derived keyboard layer must
  change.

### Runtime Model

The runtime gains one new internal concept: binding ownership.

- Direct `bind` registrations are owned by implicit singleton owners.
- `createBindingSet()` creates an explicit mutable owner.
- Each owner has:
  - a stable slot order
  - a current list of binding ids
  - a disposed flag

### Commit Flow

For `BindingSet.replace(next)`:

1. Compile `next` into temporary binding records without mutating live runtime
   state.
2. Assign each compiled record:
   - a fresh binding id
   - the set's existing slot order
   - an entry order based on the index inside `next`
3. Swap the binding id membership for the set.
4. Remove previous sequence state for old ids.
5. Make the new records visible to dispatch, `explain`, and `getBindings`.

The exact internal data structures are not part of the public API, but the
stable slot order and atomic commit semantics are.

## Alternatives and Tradeoffs

### Alternative A: Keep the Status Quo

Rejected.

Downstream code can already emulate rebinding by storing ids or handles and
manually unbinding and rebinding. That is workable, but it pushes fragile
runtime bookkeeping into application code and offers no transactional safety.

### Alternative B: Add `bindAll(...): Disposable`

Rejected for v1.

A one-shot bulk registration helper improves convenience, but it does not solve
the main problem:

- It does not provide a long-lived owner for future replacements.
- It does not preserve stable precedence across repeated replacements unless it
  grows into a binding-set abstraction anyway.

This can be reconsidered later as sugar on top of `BindingSet`.

### Alternative C: Add a Command-Aware Rebinding API

Rejected.

An API keyed by command id or command object would violate the library boundary
documented today. `powerkeys` should not own application command registries,
command palette sections, or command metadata.

### Alternative D: Callback-Based Replacement Builder

Example:

```ts
bindingSet.replace((next) => {
  next.bind('Mod+k', handler)
})
```

Rejected for v1.

This reuses the current `bind` call shape, but it makes replacement semantics
depend on arbitrary user callback execution. A data-first `replace(nextArray)`
API is easier to validate, reason about, and document as transactional.

### Selected Tradeoff

This proposal chooses simplicity and safety over maximum convenience:

- Simplicity:
  - one new owner abstraction
  - one transactional replacement method
- Safety:
  - no partial updates
  - stable cross-owner precedence
- Cost:
  - bulk replacement uses object-form bindings instead of string shorthand
  - the runtime must track owner and slot metadata internally

## Failure Modes and Edge Cases

- Invalid binding in `next`
  - `replace` throws.
  - Current bindings remain unchanged.

- Duplicate or conflicting bindings inside one set
  - Allowed.
  - Existing dispatch rules decide the winner.

- Empty replacement
  - Allowed.
  - Results in an empty but still live binding set.

- Runtime disposed before replacement
  - `replace` and `clear` throw `TypeError('Shortcut runtime is disposed')`.
  - `getBindings()` returns `[]`.

- Binding set disposed before replacement
  - `replace` and `clear` throw `TypeError('Binding set is disposed')`.
  - `getBindings()` returns `[]`.

- Replacement during an active sequence
  - Sequence state owned by the set is dropped on commit.

- Replacement during recording
  - Recording continues because it is not driven by the registered binding set.

- Replacement that removes all bindings while external UI is calling
  `isAvailable`
  - No special behavior is required.
  - `isAvailable` remains independent of registered bindings.

## Testing and Observability

### Tests

Add coverage for the following behaviors:

- creating a binding set and registering bindings through `replace`
- atomic rollback when one next binding is invalid
- `clear()` behaving the same as `replace([])`
- idempotent `dispose()`
- stable conflict precedence relative to unrelated direct bindings across
  repeated replacements
- stable conflict precedence relative to other binding sets across repeated
  replacements
- dropping active sequence state on successful replacement
- unaffected recording behavior during replacement
- `BindingSet.getBindings()` and `ShortcutRuntime.getBindings()` ordering

### Observability

- No new logging or tracing API is required.
- Existing `getBindings()`, `getActiveSequences()`, and `explain()` are
  sufficient to verify behavior in tests and demos.

## Rollout / Migration

This is an additive API and should ship in the next minor release.

Migration guidance:

- Existing `bind` and `unbind` usage does not need to change.
- Apps that currently track ids or `BindingHandle[]` for rebinding can replace
  that bookkeeping with one long-lived `BindingSet`.
- The docs should add one new common task: rebinding user-configurable
  shortcuts.

## Open Questions

None for the core API or runtime semantics in this proposal.

## Ambiguities and Blockers

- AB-1 - Resolved - Library boundary
  - Affected area: Scope / API
  - Issue: The runtime could have grown into a command-aware registry API.
  - Why it matters: That would conflict with the existing documented boundary
    between `powerkeys` and the host application.
  - Next step: Keep the API generic over bindings and leave command models in
    application code.

- AB-2 - Resolved - Replacement precedence drift
  - Affected area: Behavioral Semantics / Dispatch
  - Issue: A naive unbind-then-bind helper would change final tie-break
    precedence every time a binding collection is replaced.
  - Why it matters: Rebinding should not silently change which shortcut wins in
    otherwise identical conflicts.
  - Next step: Give each binding set a stable slot order and document it
    normatively.

- AB-3 - Deferred - Add `bindAll` sugar
  - Affected area: Ergonomics
  - Issue: Some users may still want a one-shot convenience API for static bulk
    registration.
  - Why it matters: It may improve ergonomics, but it is not required to solve
    safe rebinding.
  - Next step: Revisit after validating real usage of `BindingSet`.

## Appendix / Examples

### Downstream Pattern Today

```ts
for (const bindingId of previousBindingIds) {
  runtime.unbind(bindingId)
}

const nextBindingIds = expressions.map((expression) => runtime.bind(toInput(expression)).id)
```

### Proposed Pattern

```ts
const userBindings = runtime.createBindingSet()

function rebindResolvedShortcuts(): void {
  const nextBindings = appCommandList.flatMap((command) => {
    const expressions = resolvedBindings[command.id] ?? []

    return expressions.map((expression) => {
      if (typeof expression !== 'string') {
        return {
          scope: command.scope,
          when: command.when,
          ...expression,
          handler: command,
        }
      }

      return expression.includes(' ')
        ? {
            sequence: expression,
            scope: command.scope,
            when: command.when,
            handler: command,
          }
        : {
            combo: expression,
            scope: command.scope,
            when: command.when,
            handler: command,
          }
    })
  })

  userBindings.replace(nextBindings)
}
```

The app still owns command ids, expression parsing, persistence, and availability
rules. The runtime now owns the rebinding transaction.
