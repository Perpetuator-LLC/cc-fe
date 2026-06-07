#!/usr/bin/env node
/* Copyright (c) 2026 Perpetuator LLC
 *
 * Durable supply-chain control that goes BEYOND `yarn audit` (which only knows
 * published CVEs). It catches the #1 generic supply-chain RCE vector: dependency
 * packages that execute code at INSTALL time (preinstall/install/postinstall) —
 * the exact mechanism behind the Lazarus "Contagious Interview" droppers and the
 * compromised-axios incident. A new package that ships an install-time payload is
 * caught here even with NO CVE and full obfuscation, because it introduces an
 * install script that isn't on the reviewed allow-list.
 *
 * Usage:
 *   node scripts/check-install-scripts.cjs            # CI gate: fail on un-allow-listed scripts
 *   node scripts/check-install-scripts.cjs --update   # (re)baseline the allow-list — REVIEW the diff
 *
 * Allow-list: .allowed-install-scripts.json (committed). Baseline once with
 * --update, eyeball the list, commit it. Thereafter any NEW install-script
 * package fails CI until a human reviews what it does and adds it.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const NM = path.join(ROOT, 'node_modules');
const ALLOWLIST = path.join(ROOT, '.allowed-install-scripts.json');
const LIFECYCLE = ['preinstall', 'install', 'postinstall']; // auto-run on `yarn install`
const found = new Map(); // package name -> Set(script names)

function inspectPackage(dir) {
  const pj = path.join(dir, 'package.json');
  let j;
  try { j = JSON.parse(fs.readFileSync(pj, 'utf8')); } catch { return; }
  const s = j.scripts || {};
  const hits = LIFECYCLE.filter((k) => typeof s[k] === 'string' && s[k].trim() !== '');
  if (hits.length && j.name) {
    if (!found.has(j.name)) found.set(j.name, new Set());
    hits.forEach((h) => found.get(j.name).add(h));
  }
}

function walk(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name === '.bin' || e.name === '.cache') continue;
    const full = path.join(dir, e.name);
    if (e.name.startsWith('@')) { walk(full); continue; } // scope directory
    inspectPackage(full);
    const nested = path.join(full, 'node_modules');
    if (fs.existsSync(nested)) walk(nested); // nested deps run install scripts too
  }
}

if (!fs.existsSync(NM)) {
  console.error('node_modules not found — run `yarn install --frozen-lockfile --ignore-scripts` first.');
  process.exit(2);
}
walk(NM);

const names = [...found.keys()].sort((a, b) => a.localeCompare(b));

if (process.argv.includes('--update')) {
  fs.writeFileSync(ALLOWLIST, JSON.stringify(names, null, 2) + '\n');
  console.log(`Baselined ${names.length} install-script packages -> ${path.basename(ALLOWLIST)}.`);
  console.log('REVIEW the diff before committing — these all run code on install.');
  process.exit(0);
}

let allow;
try {
  allow = JSON.parse(fs.readFileSync(ALLOWLIST, 'utf8'));
} catch {
  console.error(`Missing/invalid ${path.basename(ALLOWLIST)} — baseline once with: node scripts/check-install-scripts.cjs --update`);
  process.exit(2);
}
const allowSet = new Set(allow);
const unexpected = names.filter((n) => !allowSet.has(n));

console.log(`[supply-chain] ${names.length} packages run install scripts; ${allow.length} reviewed/allow-listed.`);
if (unexpected.length) {
  console.error(`\n[BLOCK] ${unexpected.length} package(s) run install-time code but are NOT reviewed:`);
  for (const n of unexpected) console.error(`   - ${n}  (${[...found.get(n)].join(', ')})`);
  console.error('\nInspect each (what does its preinstall/postinstall do?). If legitimate, add it to');
  console.error('.allowed-install-scripts.json (regenerate with --update) and commit. A malicious');
  console.error('dependency that fires on install is caught right here — no CVE or signature needed.');
  process.exit(1);
}
console.log('[OK] no un-reviewed install scripts.');
