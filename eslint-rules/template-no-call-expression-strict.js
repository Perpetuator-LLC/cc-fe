// Copyright (c) 2026 Perpetuator LLC
//
// Custom replacement for @angular-eslint/template/no-call-expression.
//
// Why: signal reads (`mySignal()`) look like function calls in templates, but
// they are O(1) reads and absolutely the recommended Angular pattern. The
// upstream rule has no way to distinguish them, so it flags them as warnings.
// This rule auto-detects signal-typed class members by parsing the companion
// component .ts file, and allows those calls to pass.
//
// What still gets flagged: arbitrary method calls and getter-disguised-as-method
// calls — the actual perf footgun the upstream rule was designed to catch.
//
// Allowed by default (in addition to detected signals):
//   - `$any(...)` — type-narrowing helper (matches upstream behavior)
//   - Calls inside bound event handlers, e.g. `(click)="doThing()"` — these
//     fire once per event, not once per change-detection cycle
//   - Anything in the `allowList` option (matches upstream API)
//   - Anything starting with `allowPrefix` / ending with `allowSuffix`

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Signal detection: parse the companion .ts file once and remember which
// class properties are signals.
// ---------------------------------------------------------------------------

/** Signal-producing factory call expressions. */
const SIGNAL_FACTORIES = new Set([
  'signal',
  'computed',
  'input',
  'model',
  'viewChild',
  'viewChildren',
  'contentChild',
  'contentChildren',
  'toSignal',
  'linkedSignal',
  'resource',
  'rxResource',
  'httpResource',
]);

/** Signal-producing type-annotation names (covers explicit-typed fields). */
const SIGNAL_TYPES = new Set([
  'Signal',
  'WritableSignal',
  'InputSignal',
  'InputSignalWithTransform',
  'ModelSignal',
  'OutputEmitterRef', // not a signal, but called as `emit()` from templates — keep false
]);
SIGNAL_TYPES.delete('OutputEmitterRef');

/** Cache: absolute .ts path -> Set<string> of signal property names. */
const signalNameCache = new Map();
/** Cache mtime so edits to the .ts file invalidate the cache. */
const signalNameMtime = new Map();

/** Project-wide signal-name union, computed once per process. */
let projectSignalNames = null;

let tsLib = null;
function ts() {
  if (!tsLib) {
    tsLib = require('typescript');
  }
  return tsLib;
}

/**
 * Return true if the given property initializer is a signal-producing call.
 *
 * Handles:
 *   foo = signal(0)
 *   foo = computed(() => ...)
 *   foo = input<string>('x')
 *   foo = input.required<string>()
 *   foo = model.required<string>()
 *   foo = viewChild('ref')
 *   foo = toSignal(obs$)
 */
function initializerLooksLikeSignal(initializer) {
  if (!initializer) return false;
  const t = ts();
  if (!t.isCallExpression(initializer)) return false;

  const callee = initializer.expression;
  // Plain identifier: signal(0), computed(...), input(...)
  if (t.isIdentifier(callee)) {
    return SIGNAL_FACTORIES.has(callee.text);
  }
  // Property access: input.required<T>(), model.required<T>()
  if (t.isPropertyAccessExpression(callee)) {
    const root = callee.expression;
    if (t.isIdentifier(root) && SIGNAL_FACTORIES.has(root.text)) {
      return true;
    }
  }
  return false;
}

/**
 * Return true if the given TS type node references one of the signal type names.
 *   foo: Signal<number>
 *   foo: WritableSignal<User[]>
 *   foo: InputSignal<string>
 */
function typeNodeLooksLikeSignal(typeNode) {
  if (!typeNode) return false;
  const t = ts();
  if (t.isTypeReferenceNode(typeNode)) {
    const name = typeNode.typeName;
    if (t.isIdentifier(name) && SIGNAL_TYPES.has(name.text)) return true;
    if (t.isQualifiedName(name) && SIGNAL_TYPES.has(name.right.text)) return true;
  }
  return false;
}

/**
 * Parse a component .ts file and return the set of class-member names that
 * are signals. Result is cached per file mtime.
 */
function getSignalNamesForComponentFile(tsFilePath) {
  let stat;
  try {
    stat = fs.statSync(tsFilePath);
  } catch {
    return null; // No companion file → no signals to allow.
  }
  const mtime = stat.mtimeMs;
  if (signalNameMtime.get(tsFilePath) === mtime) {
    return signalNameCache.get(tsFilePath);
  }

  const t = ts();
  let source;
  try {
    source = fs.readFileSync(tsFilePath, 'utf8');
  } catch {
    return null;
  }
  const sf = t.createSourceFile(tsFilePath, source, t.ScriptTarget.Latest, true);
  const names = new Set();

  function visitClass(node) {
    for (const member of node.members) {
      if (!member.name || !t.isIdentifier(member.name)) continue;
      const name = member.name.text;

      // Property declarations: `foo = signal(0)` or `foo: Signal<T>`
      if (t.isPropertyDeclaration(member)) {
        if (initializerLooksLikeSignal(member.initializer)) {
          names.add(name);
          continue;
        }
        if (typeNodeLooksLikeSignal(member.type)) {
          names.add(name);
          continue;
        }
      }

      // Getter accessors: a getter is *exactly* a property read — calling it
      // looks like `foo()` only if the consumer wrote it that way. Templates
      // access getters as `foo` (no parens), so we deliberately don't add
      // getters here. If a user has `get foo(): Signal<T>` they should read
      // it as `foo()` and the type-annotation branch above already covered
      // most cases.
    }
  }

  function visit(node) {
    if (t.isClassDeclaration(node) || t.isClassExpression(node)) {
      visitClass(node);
    }
    t.forEachChild(node, visit);
  }
  visit(sf);

  signalNameCache.set(tsFilePath, names);
  signalNameMtime.set(tsFilePath, mtime);
  return names;
}

/**
 * Map an HTML template file to its companion .ts component file.
 *   foo.component.html → foo.component.ts
 *   foo.html           → foo.ts
 */
function companionTsPath(htmlFilePath) {
  if (!htmlFilePath || typeof htmlFilePath !== 'string') return null;
  if (!htmlFilePath.endsWith('.html')) return null;
  const candidate = htmlFilePath.slice(0, -'.html'.length) + '.ts';
  return path.isAbsolute(candidate) ? candidate : path.resolve(candidate);
}

/**
 * Walk a directory tree and collect every .ts file (skipping node_modules,
 * dist, generated files, *.spec.ts).
 */
function collectTsFiles(rootDir, out) {
  let entries;
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name.startsWith('.')) continue;
    const full = path.join(rootDir, ent.name);
    if (ent.isDirectory()) {
      collectTsFiles(full, out);
    } else if (
      ent.isFile() &&
      ent.name.endsWith('.ts') &&
      !ent.name.endsWith('.spec.ts') &&
      !ent.name.endsWith('.d.ts')
    ) {
      out.push(full);
    }
  }
}

/**
 * Compute the union of signal names across every component/service .ts file
 * in the project. Result is cached for the lifetime of the lint process —
 * adding/removing signals requires re-running ESLint (already true for any
 * cached-result rule).
 */
function getProjectSignalNames(rootDir) {
  if (projectSignalNames) return projectSignalNames;
  const files = [];
  collectTsFiles(rootDir, files);
  const union = new Set();
  for (const f of files) {
    const names = getSignalNamesForComponentFile(f);
    if (names) for (const n of names) union.add(n);
  }
  projectSignalNames = union;
  return union;
}

// ---------------------------------------------------------------------------
// Helpers borrowed in spirit from upstream rule.
// ---------------------------------------------------------------------------

/** Walk up the template AST to find the nearest BoundEvent ancestor. */
function isInsideBoundEvent(node) {
  let cur = node.parent;
  while (cur) {
    if (cur.type === 'BoundEvent') return true;
    cur = cur.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow call expressions in templates, except signal reads, event handlers, and explicitly-allowed names.',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          allowList: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          allowPrefix: { type: 'string' },
          allowSuffix: { type: 'string' },
          /** Force-allow these names even if not detected as signals. */
          extraAllowedNames: { type: 'array', items: { type: 'string' }, uniqueItems: true },
          /**
           * If set, also allow any call whose leaf name matches a signal-typed
           * member of *any* .ts file under this directory. Useful for
           * service-exposed signals like `audioService.queueLength()`.
           */
          projectSignalScanRoot: { type: 'string' },
        },
      },
    ],
    messages: {
      noCallExpression:
        "Avoid calling '{{name}}()' in templates — it runs every change-detection cycle. " +
        'Use a pipe, a computed signal, or a getter that returns a value.',
    },
  },

  create(context) {
    const opts = context.options[0] || {};
    const allowList = new Set(opts.allowList || []);
    const extraAllowed = new Set(opts.extraAllowedNames || []);
    const allowPrefix = opts.allowPrefix;
    const allowSuffix = opts.allowSuffix;
    const scanRoot = opts.projectSignalScanRoot
      ? path.resolve(context.cwd || process.cwd(), opts.projectSignalScanRoot)
      : null;

    // Compute companion-file signal names lazily (per-lint-file).
    let signalNames = null;
    function getSignals() {
      if (signalNames !== null) return signalNames;
      const tsPath = companionTsPath(context.filename || context.getFilename?.());
      signalNames = (tsPath && getSignalNamesForComponentFile(tsPath)) || new Set();
      return signalNames;
    }

    function getProjectSignals() {
      return scanRoot ? getProjectSignalNames(scanRoot) : null;
    }

    // Match all template Call nodes except `$any(...)` (upstream parity).
    return {
      'Call[receiver.name!="$any"]'(node) {
        const receiver = node.receiver;
        // Only meaningful when we can read a name off the receiver.
        const name = receiver && typeof receiver === 'object' ? receiver.name : undefined;
        if (!name || typeof name !== 'string') return;

        // Event handlers fire on user action, not on CD — safe.
        if (isInsideBoundEvent(node)) return;

        if (allowList.has(name)) return;
        if (extraAllowed.has(name)) return;
        if (allowPrefix && name.startsWith(allowPrefix)) return;
        if (allowSuffix && name.endsWith(allowSuffix)) return;

        if (getSignals().has(name)) return;
        const proj = getProjectSignals();
        if (proj && proj.has(name)) return;

        // Report on the source span of the call.
        const span = node.sourceSpan;
        const sourceCode = context.sourceCode;
        const loc = span
          ? {
              start: sourceCode.getLocFromIndex(span.start),
              end: sourceCode.getLocFromIndex(span.end),
            }
          : node.loc;
        context.report({
          loc,
          messageId: 'noCallExpression',
          data: { name },
        });
      },
    };
  },
};
