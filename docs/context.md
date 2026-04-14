# Overview

`powerkeys` is a DOM-bound keyboard shortcut runtime for web applications that
need more than flat key listeners. It combines combo matching, multi-step
sequences, scope-aware conflict resolution, `when`-clause gating, shortcut
recording, and external availability checks behind a single runtime created
with `createShortcuts`.

The library is designed around one rule: keyboard behavior should be described
as declarative bindings, while transient application state such as modal
visibility, selection state, and read-only mode should live in runtime context
and active scopes.

# When to Use

Use `powerkeys` when your app needs one or more of these:

- layered shortcut scopes such as modal over editor over root
- multi-step sequences such as `g g` or `g h`
- state-dependent shortcuts gated by `when` expressions
- shortcut recording for user-configurable keybindings
- element-scoped shortcut boundaries instead of global document listeners

# When Not to Use

`powerkeys` is a poor fit when you need one or more of these instead:

- OS-level or browser-global shortcuts outside the current document
- a full rich-text editor command system with its own input model already in
  charge of keyboard dispatch
- shortcut behavior that should ignore application state and can stay as a
  couple of direct event listeners

# Core Abstractions

`ShortcutRuntime`

- Owns listeners, bindings, sequence state, runtime context, and recording.

Bindings

- A binding is either a single combo such as `Mod+k` or a sequence such as
  `g g`.
- Bindings may declare scopes, priorities, editable policies, `when` clauses,
  and event-consumption behavior.

Scopes

- Active scopes come from `getActiveScopes`.
- Scope order matters. Earlier scopes have higher precedence.
- The runtime always appends `root`, so unscoped bindings remain available.

Runtime Context

- User state is written with `setContext` or `batchContext` using dotted paths
  such as `editor.hasSelection`.
- `when` clauses and handlers receive built-in namespaces named `event`,
  `scope`, `runtime`, and `context`.
- User context is also spread onto the top level of the evaluation object, so
  `editor.hasSelection` is directly readable in a `when` clause.
- `isAvailable` uses the same scope and `when` machinery for external command
  models. Its `event` namespace is present but inert, with missing keys set to
  `undefined` and modifier booleans set to `false`.

Recording

- Recording captures canonical shortcut expressions from live input.
- Recording is separate from binding registration. The usual flow is to record,
  persist the expression, and later bind that expression.

# Data Flow / Lifecycle

1. Create a runtime with a document or element boundary.
2. Register bindings with `bind`.
3. Keep application state synchronized with `setContext` or `batchContext`.
4. Return active scopes from `getActiveScopes` in precedence order.
5. On each keyboard event, `powerkeys` normalizes the event, filters bindings by
   boundary, scope, editable policy, and matcher state, then evaluates any
   `when` clauses.
6. At most one binding wins. Higher priority wins first, then sequence bindings
   over combos, then longer sequences, then scope order, then the most recently
   registered binding.
7. Dispose the runtime when the owning UI subtree or application shuts down.

# Common Tasks -> Recommended APIs

Open a command palette

- `bind({ combo: "Mod+k", preventDefault: true, handler })`

Keep modal shortcuts above editor shortcuts

- `getActiveScopes: () => ["modal", "editor"]`
- Bind modal and editor actions to the same combo with different scopes

Gate a shortcut on app state

- `setContext("editor.hasSelection", true)`
- `bind({ combo: "c", when: "editor.hasSelection", handler })`

Reuse the same availability rules in an external command palette

- Define your own command object with `scope` and `when`
- `isAvailable(command)` before rendering or invoking it
- Reuse the same `scope` and `when` in `bind({ ..., handler })` when attaching a shortcut

Register multi-step navigation

- `bind({ sequence: "g g", handler })`
- Adjust `sequenceTimeout` when the default one second window is too short or
  too long

Temporarily disable shortcuts

- `pause(scope)` and `resume(scope)`
- Omit the scope to pause or resume the whole runtime
- `pause` affects keyboard dispatch only. `isAvailable` still evaluates against
  the raw active scopes from `getActiveScopes`.

Let users choose their own shortcut

- `record({ onUpdate, suppressHandlers: true })`
- Save the returned `ShortcutRecording.expression`
- Rebind that expression later with `bind`

Debug why a shortcut did not fire

- `explain(event)` to inspect scope, matcher, and `when`-clause decisions

# Recommended Patterns

- Define shared availability once on your own command object with `scope` and `when`.
- Reuse that same `scope` and `when` when attaching a keyboard shortcut with `bind`.
- Keep command-palette metadata such as title, subtitle, group, and keywords in your own command model, not in `powerkeys`.
- Use `setContext` or `batchContext` for transient app state that should affect both shortcuts and external command availability.
- Use `isAvailable` as a structural check. Extra fields on your command object are ignored.

# Patterns to Avoid

- Do not make external command availability depend on keyboard-event details such as `event.key` or modifier state. `isAvailable` exposes an inert `event` object.
- Do not use `pause` as a command-palette visibility mechanism. It affects keyboard dispatch only.
- Do not duplicate the same availability rule in separate shortcut-only and palette-only conditions when one shared `scope` plus `when` clause will do.
- Do not move palette presentation concerns into `powerkeys`; it owns availability checks, not command registration or menu rendering.

# Invariants and Constraints

- `root` is always active, even when `getActiveScopes` returns nothing.
- Each binding must define exactly one of `combo` or `sequence`.
- Only one recording session may be active per runtime.
- Only one binding wins a given event.
- Editable targets are blocked by default.
- Reserved top-level context names are `context`, `event`, `scope`, and
  `runtime`.
- Sequence state expires after `sequenceTimeout` milliseconds of inactivity.
- `pause` and `resume` are reference-counted, so repeated pauses require
  matching resumes.

# Error Model

- Binding-definition errors throw synchronously during `bind`.
- Invalid `when` syntax also throws synchronously during `isAvailable`.
- Handler errors are sent to `onError` when provided; otherwise they are
  rethrown asynchronously.
- `when`-clause errors do not throw through dispatch. They cause that binding to
  fail its `when` check, and the error appears in `explain`.
- `when`-clause evaluation errors inside `isAvailable` return `false`.
- Recording `onUpdate` errors are reported through `onError` and do not cancel
  the active recording.
- Cancelling a recording rejects `RecordingSession.finished` with an
  `AbortError`.

# Terminology

- **Combo**
  - One key press plus zero or more modifiers, such as `Ctrl+k` or `Meta+/`.

- **Sequence**
  - Whitespace-separated combo steps, such as `g g`.

- **Scope**
  - A named dispatch layer used to resolve conflicts between otherwise matching
    bindings.

- **When Clause**
  - A boolean expression evaluated against runtime context before dispatch.

- **Editable Policy**
  - The rule that decides whether a binding may run while focus is inside an
    editable element.

- **Boundary**
  - The document or element passed as `target`, which limits which native events
    the runtime considers.

# Non-Goals

- Global shortcuts outside the current DOM boundary
- Full command-palette UI state or menu rendering
- Command registration or command identifiers owned by `powerkeys`
- Framework-specific hooks or adapters
