// Copyright (c) 2025-2026 Perpetuator LLC
/**
 * M3 Theme Palette Generator
 *
 * Generates Material Design 3 tonal palettes from base hex colors using
 * Google's HCT algorithm. The output is a generated Sass partial consumed by
 * src/m3-theme.scss, which remains the app's single public theme entrypoint.
 *
 * Usage:
 *   yarn theme:generate
 */

import fs from 'fs';
import path from 'path';
import { argbFromHex, hexFromArgb, TonalPalette, Hct } from '@material/material-color-utilities';

// Edit brand/source colors here, then run `yarn theme:generate`.
//
// Material colors (primary, secondary, tertiary, error) are used to build
// Angular Material-valid palettes. App colors (accent, success, warning, info)
// are generated for our own CSS tokens and must not be passed directly to
// `mat.define-theme()`.
const BASE_COLORS: Record<string, string> = {
  primary: '#3b82f6',
  secondary: '#22d3ee',
  tertiary: '#a78bfa',
  accent: '#f97316',
  error: '#ef4444',
  success: '#10b981',
  warning: '#fbbf24',
  info: '#38bdf8',
};

const MATERIAL_TONES = [0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];
const NEUTRAL_TONES = [
  0, 4, 6, 10, 12, 17, 20, 22, 24, 25, 30, 35, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100,
];

// Hand-tuned surface colors pinned onto the neutral ramp so that BOTH systems
// agree on the same hex:
//   - mat.define-theme() bakes these into the Material component tokens
//     (--mat-menu-container-color, --mat-select-panel-background-color, etc.)
//   - our own CSS reads them via get-color($neutral-palette, <tone>) in m3-theme.scss
//
// Angular's M3 sys-color maps these neutral tones to surface roles
// (see @angular/material core/tokens/m3/_md-sys-color.scss):
//   dark:  surface/surface-dim 6, container-low 10, container 12, container-high 17
//   light: surface/surface-bright 98, container-low 96, container 94, container-high 92
const NEUTRAL_OVERRIDES: Record<number, string> = {
  // dark scheme surfaces
  6: '#0a1018',
  10: '#0e1620',
  12: '#121a23',
  17: '#182230',
  // light scheme surfaces
  92: '#e8eaef',
  94: '#eef0f5',
  96: '#f4f5fa',
  98: '#fbf9fd',
};

function generatePalette(hexColor: string, tones: number[]): Record<number, string> {
  const palette = TonalPalette.fromInt(argbFromHex(hexColor));
  const result: Record<number, string> = {};

  tones.forEach((tone) => {
    result[tone] = hexFromArgb(palette.tone(tone));
  });

  return result;
}

function generateNeutralPalette(
  baseHexColor: string,
  chroma: number,
  tones: number[],
  applyOverrides = false,
): Record<number, string> {
  const hue = Hct.fromInt(argbFromHex(baseHexColor)).hue;
  const result: Record<number, string> = {};

  tones.forEach((tone) => {
    const override = applyOverrides ? NEUTRAL_OVERRIDES[tone] : undefined;
    result[tone] = override ?? hexFromArgb(Hct.from(hue, chroma, tone).toInt());
  });

  return result;
}

function formatPalette(palette: Record<number, string>): string {
  const entries = Object.entries(palette);
  const lines: string[] = [];

  for (let i = 0; i < entries.length; i += 4) {
    const chunk = entries.slice(i, i + 4);
    lines.push(`    ${chunk.map(([tone, hex]) => `${tone}: ${hex}`).join(', ')},`);
  }

  return lines.join('\n');
}

function formatThemePalettes(): string {
  const palettes: Record<string, Record<number, string>> = {
    primary: generatePalette(BASE_COLORS['primary'], MATERIAL_TONES),
    secondary: generatePalette(BASE_COLORS['secondary'], MATERIAL_TONES),
    tertiary: generatePalette(BASE_COLORS['tertiary'], MATERIAL_TONES),
    accent: generatePalette(BASE_COLORS['accent'], MATERIAL_TONES),
    error: generatePalette(BASE_COLORS['error'], MATERIAL_TONES),
    neutral: generateNeutralPalette(BASE_COLORS['primary'], 4, NEUTRAL_TONES, true),
    'neutral-variant': generateNeutralPalette(BASE_COLORS['primary'], 8, NEUTRAL_TONES),
    success: generatePalette(BASE_COLORS['success'], MATERIAL_TONES),
    warning: generatePalette(BASE_COLORS['warning'], MATERIAL_TONES),
    info: generatePalette(BASE_COLORS['info'], MATERIAL_TONES),
  };

  return Object.entries(palettes)
    .map(
      ([name, palette]) => `  ${name}: (
${formatPalette(palette)}
  ),`,
    )
    .join('\n');
}

function formatMaterialThemePalettes(): string {
  const palettes: Record<string, Record<number, string>> = {
    primary: generatePalette(BASE_COLORS['primary'], MATERIAL_TONES),
    secondary: generatePalette(BASE_COLORS['secondary'], MATERIAL_TONES),
    tertiary: generatePalette(BASE_COLORS['tertiary'], MATERIAL_TONES),
    error: generatePalette(BASE_COLORS['error'], MATERIAL_TONES),
    neutral: generateNeutralPalette(BASE_COLORS['primary'], 4, NEUTRAL_TONES, true),
    'neutral-variant': generateNeutralPalette(BASE_COLORS['primary'], 8, MATERIAL_TONES),
  };

  return Object.entries(palettes)
    .map(
      ([name, palette]) => `  ${name}: (
${formatPalette(palette)}
  ),`,
    )
    .join('\n');
}

function generateOutput(): string {
  const timestamp = new Date().toISOString();
  const baseColorLines = Object.entries(BASE_COLORS)
    .map(([name, hex]) => `//   ${name}: ${hex}`)
    .join('\n');

  return `/* Copyright (c) 2025-2026 Perpetuator LLC */
// ============================================================================
// Generated M3 Theme Palettes
// DO NOT EDIT - Generated by: yarn theme:generate
// Generated at: ${timestamp}
//
// Base colors:
${baseColorLines}
// ============================================================================

$material-palettes: (
${formatMaterialThemePalettes()}
);

$theme-palettes: (
${formatThemePalettes()}
);
`;
}

const output = generateOutput();
const outputPath = path.join(process.cwd(), 'src/styles/_theme-palettes.generated.scss');

fs.writeFileSync(outputPath, output);

console.log('Generated M3 theme palettes.');
console.log(`Output file: ${outputPath}`);
console.log('');
console.log('Base colors used:');
Object.entries(BASE_COLORS).forEach(([name, hex]) => {
  console.log(`  ${name}: ${hex}`);
});
console.log('');
console.log('src/m3-theme.scss consumes this generated palette partial.');
