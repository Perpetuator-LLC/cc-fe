// Copyright (c) 2026 Perpetuator LLC
//
// Coverage ratchet: runs the unit suite with --code-coverage and fails when
// global coverage drops below the committed minimums. Used by
// `yarn test:coverage`, the pre-push hook, and the CI test job.
//
// Usage:
//   node scripts/check-coverage.js [extra ng-test args]
//   yarn test:coverage                                      # local, headed Chrome
//   yarn test:coverage --browsers=ChromeHeadless            # headless (CI)
//
// NOTE: implemented as a wrapper that parses karma-coverage's text-summary
// instead of a karma.conf.js with coverageReporter.check, because the
// security resolution `minimatch >= 10.2.3` in package.json breaks Karma 6
// whenever a config *file* is supplied (Karma excludes the config file via a
// minimatch call signature removed in minimatch v10).

'use strict';

const { spawn } = require('node:child_process');

// The ratchet. Each value sits just below the measured global coverage at the
// time it was last raised, so real regressions fail while run-to-run noise
// does not. RAISE these as coverage grows — NEVER lower them.
const COVERAGE_MINIMUMS = {
  statements: 46.7,
  branches: 34.9,
  functions: 42.3,
  lines: 47.4,
};

const ngBin = require.resolve('@angular/cli/bin/ng.js');
const args = [ngBin, 'test', '--watch=false', '--code-coverage', ...process.argv.slice(2)];

const child = spawn(process.execPath, args, { stdio: ['inherit', 'pipe', 'inherit'] });

let output = '';
child.stdout.on('data', (chunk) => {
  output += chunk;
  process.stdout.write(chunk);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`\n[coverage] test run failed (exit code ${code}) — coverage not checked.`);
    process.exit(code ?? 1);
  }

  // Strip ANSI escape sequences (progress reporter cursor movements, colors).
  const plain = output.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');
  const matches = [...plain.matchAll(/^(Statements|Branches|Functions|Lines)\s*:\s*([\d.]+)%/gm)];
  const actual = {};
  for (const [, metric, pct] of matches) {
    actual[metric.toLowerCase()] = parseFloat(pct);
  }

  const metrics = Object.keys(COVERAGE_MINIMUMS);
  if (!metrics.every((m) => typeof actual[m] === 'number' && !Number.isNaN(actual[m]))) {
    console.error('\n[coverage] no coverage summary found in test output — cannot enforce the ratchet.');
    process.exit(1);
  }

  let failed = false;
  console.log('\n[coverage] ratchet check (minimums rise with coverage — never lower them):');
  for (const metric of metrics) {
    const min = COVERAGE_MINIMUMS[metric];
    const ok = actual[metric] >= min;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${metric.padEnd(10)} ${actual[metric].toFixed(2)}% (minimum ${min}%)`);
    if (!ok) failed = true;
  }

  if (failed) {
    console.error('\n[coverage] global coverage fell below the committed minimums — add tests for your change.');
    process.exit(1);
  }
});
