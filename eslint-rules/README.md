# Local ESLint Rules

Custom ESLint rules maintained in this repo. We use these in place of forking
upstream plugins when we need behavior that the upstream rules don't support.

## Rules

### `cc-local/template-no-call-expression-strict`

A stricter, signal-aware replacement for
`@angular-eslint/template/no-call-expression`.

**Problem with the upstream rule:** it flags every `foo()` in a template,
including signal reads — which are O(1) and the recommended Angular pattern.
The upstream rule supports an `allowList` / `allowPrefix` / `allowSuffix`, but
signal names in this codebase don't follow a single convention
(`isPlaying`, `currentTime`, `hasQueue`, `_isMuted`, etc.), so a name list
would mean constant maintenance.

**What this rule does:** for each `foo()` call in a template, it parses the
companion component `.ts` file and checks whether `foo` is a class member
initialized by a signal factory (`signal()`, `computed()`, `input()`,
`input.required()`, `model()`, `viewChild()`, `toSignal()`, etc.) **or**
typed with a signal type (`Signal<T>`, `WritableSignal<T>`, `InputSignal<T>`).
If yes, the call is allowed. Otherwise it's reported.

It also keeps upstream behavior for:

- `$any(...)` — always allowed
- Calls inside `(event)="handler()"` bindings — always allowed
- `allowList`, `allowPrefix`, `allowSuffix` options — same semantics

**Per-file caching:** parsed signal-name sets are cached by file mtime, so
re-runs are cheap.

**Config example:**

```js
'cc-local/template-no-call-expression-strict': [
  'error',
  {
    allowList: ['get', 'getRawValue', 'hasError', 'getError'],
    extraAllowedNames: ['trackByX'], // force-allow without companion-file check
  },
],
```

**Caveats:**

- Only looks at the **first** companion `.ts` file (same basename, same dir).
  Inherited signals from base classes are not detected. Add them to
  `extraAllowedNames` if needed.
- Getters that return signals are _not_ auto-detected (templates almost
  always access getters without parens anyway).
