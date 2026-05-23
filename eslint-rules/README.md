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

**Optional: TypeScript type-checker mode.** Enable `useTypeChecker` to use
the TS type-checker for resolution. This catches cases pure-syntactic
detection misses:

- **Aliased signals:** `protected isLoggedIn = this.auth.isLoggedIn;` — type
  inferred as `Signal<boolean>`, so allowed.
- **Getter returning a signal:** `get userHistory(): WritableSignal<T> { ... }`.
- **Inherited signals** from base classes.
- **Service-exposed signals** in property chains like
  `audioService.queueLength()` (via the `projectScan` union).

The type-checker correctly identifies `Signal<T>` — which TypeScript
represents internally as a _callable intersection_ with no top-level symbol
named `Signal` — by inspecting the formatted type string first, then falling
back to symbol/base-type walks.

**Config example:**

```js
'cc-local/template-no-call-expression-strict': [
  'warn',
  {
    allowList: ['get', 'getRawValue', 'hasError', 'getError'],
    extraAllowedNames: ['trackByX'], // force-allow without companion-file check
    projectSignalScanRoot: 'src/app', // syntactic fallback for cross-file
    useTypeChecker: {
      tsconfig: 'tsconfig.app.json',
      projectScan: true, // build a project-wide signal-name union
    },
  },
],
```

**Performance:** the TS Program is built lazily on first use and cached for
the lint process. In this repo, `yarn lint` runs in ~5s with type-checker
mode on (vs ~4s without). Subsequent files inside the same lint run pay
no extra cost.

**Caveats:**

- Without `useTypeChecker`, only looks at the **first** companion `.ts` file
  (same basename, same dir). Inherited / aliased / getter-returning signals
  are not detected — enable type-checker mode for those.
