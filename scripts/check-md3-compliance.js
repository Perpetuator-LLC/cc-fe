#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC

/**
 * MD3 Compliance Checker for Angular Components
 * Checks templates and SCSS files for MD3 best practices
 */

const fs = require('fs');
const path = require('path');

// Recursively find files matching pattern
function findFiles(dir, pattern) {
  const results = [];

  function walk(currentDir) {
    const files = fs.readdirSync(currentDir);

    files.forEach((file) => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        walk(filePath);
      } else if (stat.isFile() && file.match(pattern)) {
        results.push(filePath);
      }
    });
  }

  walk(dir);
  return results;
}

const errors = [];
const warnings = [];

// Patterns to detect violations
const PATTERNS = {
  // Template violations
  inlineStyles: /<[^>]+style\s*=\s*["'][^"']+["']/g,
  genericButton: /<button(?![^>]*mat-)(?![^>]*matMenuTriggerFor)(?![^>]*matDialogClose)/g,
  genericInput:
    /<input(?![^>]*matInput)(?![^>]*matChipInputFor)(?![^>]*matSliderThumb)(?![^>]*aria-hidden)(?![^>]*#commandInput)(?![^>]*type\s*=\s*["'](?:file|hidden|color|range|checkbox|radio|time|datetime-local)["'])(?![^>]*class\s*=\s*["'][^"']*\b(?:command-input|team-input|variable-input|native-datetime|time-input)\b[^"']*["'])/g,
  ngDeepInTemplate: /::ng-deep/g,

  // SCSS violations
  ngDeepSelector: /::ng-deep/g,
  hardcodedPx: /\b(?:margin|padding|gap|font-size)(?:-(?:top|left|right|bottom))?\s*:\s*(?!0\s|var\()[0-9]+px/g,
  hardcodedColors: /#[0-9a-fA-F]{3,6}(?!\s*\/\/|\s*\/\*)/g,
  rgbColors: /rgb\(|rgba\(/g,
  hardcodedRadius: /border-radius\s*:\s*(?!0\s|var\()[0-9]+px/g,
};

function checkFile(filePath, fileContent, isTemplate = false) {
  const fileName = path.basename(filePath);
  const results = {
    file: filePath,
    errors: [],
    warnings: [],
  };

  if (isTemplate) {
    // Strip HTML comments to avoid false positives on commented-out code
    const strippedContent = fileContent.replace(/<!--[\s\S]*?-->/g, (match) => match.replace(/[^\n]/g, ' '));

    // Check for inline styles
    const inlineStyleMatches = strippedContent.match(PATTERNS.inlineStyles);
    if (inlineStyleMatches) {
      results.errors.push({
        rule: 'no-inline-styles',
        message: `Found ${inlineStyleMatches.length} inline style(s). Use component SCSS or Material component variants.`,
        lines: findLineNumbers(strippedContent, PATTERNS.inlineStyles),
      });
    }

    // Check for generic buttons (should use Material variants)
    const genericButtonMatches = strippedContent.match(PATTERNS.genericButton);
    if (genericButtonMatches) {
      results.warnings.push({
        rule: 'use-material-buttons',
        message: `Found ${genericButtonMatches.length} generic button(s). Consider using Material button variants (mat-button, mat-flat-button, mat-raised-button).`,
        lines: findLineNumbers(strippedContent, PATTERNS.genericButton),
      });
    }

    // Check for generic inputs (should use matInput)
    const genericInputMatches = strippedContent.match(PATTERNS.genericInput);
    if (genericInputMatches) {
      results.warnings.push({
        rule: 'use-material-inputs',
        message: `Found ${genericInputMatches.length} generic input(s). Use matInput directive with mat-form-field.`,
        lines: findLineNumbers(strippedContent, PATTERNS.genericInput),
      });
    }
  } else {
    // SCSS checks

    // Check for ::ng-deep (exclude intentional exceptions with stylelint-disable)
    const ngDeepLines = findLineNumbers(fileContent, PATTERNS.ngDeepSelector);
    const contentLines = fileContent.split('\n');
    const unexcusedNgDeepLines = ngDeepLines.filter((lineNum) => {
      for (let i = Math.max(0, lineNum - 3); i < lineNum; i++) {
        if (contentLines[i] && contentLines[i].includes('stylelint-disable')) return false;
      }
      return true;
    });
    if (unexcusedNgDeepLines.length > 0) {
      results.errors.push({
        rule: 'no-ng-deep',
        message: `Found ${unexcusedNgDeepLines.length} ::ng-deep selector(s). This is deprecated. Use CSS custom properties or target Material classes directly.`,
        lines: unexcusedNgDeepLines,
      });
    }

    // Check for hardcoded px values (4px spacing grid, 2px font-size grid)
    const offGridLines = [];
    contentLines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
      const isFontSize = /\bfont-size\s*:/.test(trimmed);
      const spacingMatch = trimmed.match(PATTERNS.hardcodedPx);
      if (spacingMatch) {
        const pxValues = trimmed.match(/(\d+)px/g);
        if (pxValues) {
          const gridSize = isFontSize ? 2 : 4;
          const hasOffGrid = pxValues.some((v) => {
            const num = parseInt(v);
            return num !== 0 && num % gridSize !== 0 && num > 4;
          });
          if (hasOffGrid) offGridLines.push(index + 1);
        }
      }
    });
    if (offGridLines.length > 0) {
      results.warnings.push({
        rule: 'use-4px-grid',
        message: `Found ${offGridLines.length} spacing value(s) not on grid. Use MD3 4px spacing grid or 2px font-size grid.`,
        lines: offGridLines,
      });
    }

    // Check for hardcoded colors (skip comment lines)
    const colorLines = findLineNumbers(fileContent, PATTERNS.hardcodedColors).filter((lineNum) => {
      const line = contentLines[lineNum - 1].trim();
      return !line.startsWith('//') && !line.startsWith('/*');
    });
    if (colorLines.length > 0) {
      results.warnings.push({
        rule: 'use-design-tokens',
        message: `Found ${colorLines.length} hardcoded color(s). Use MD3 design tokens (--md-sys-color-*) for theme support.`,
        lines: colorLines,
      });
    }

    // Check for rgb/rgba colors (skip comment lines)
    const rgbLines = findLineNumbers(fileContent, PATTERNS.rgbColors).filter((lineNum) => {
      const line = contentLines[lineNum - 1].trim();
      return !line.startsWith('//') && !line.startsWith('/*');
    });
    if (rgbLines.length > 0) {
      results.warnings.push({
        rule: 'use-design-tokens',
        message: `Found ${rgbLines.length} rgb/rgba color(s). Use MD3 design tokens (--md-sys-color-*) for theme support.`,
        lines: rgbLines,
      });
    }

    // Check for hardcoded border-radius (only flag non-MD3 values)
    const VALID_RADIUS = new Set([0, 4, 8, 12, 16, 999]);
    const radiusRegex = /border-radius\s*:\s*([^;]+)/g;
    let radiusMatch;
    const nonStandardRadiusLines = [];
    while ((radiusMatch = radiusRegex.exec(fileContent)) !== null) {
      const value = radiusMatch[1].trim();
      if (
        value.startsWith('var(') ||
        /^0(\s|$|!)/.test(value) ||
        value === '0' ||
        value === 'inherit' ||
        value === 'unset'
      )
        continue;
      const pxValues = value.match(/(\d+)px/g);
      const pctValues = value.match(/(\d+)%/g);
      if (pxValues) {
        const hasNonStandard = pxValues.some((v) => !VALID_RADIUS.has(parseInt(v)));
        if (hasNonStandard) {
          const lineNum = fileContent.substring(0, radiusMatch.index).split('\n').length;
          nonStandardRadiusLines.push(lineNum);
        }
      } else if (!pctValues) {
        const lineNum = fileContent.substring(0, radiusMatch.index).split('\n').length;
        nonStandardRadiusLines.push(lineNum);
      }
    }
    if (nonStandardRadiusLines.length > 0) {
      results.warnings.push({
        rule: 'use-standard-radius',
        message: `Found ${nonStandardRadiusLines.length} non-standard border-radius value(s). Use MD3 values: 4px, 8px, 12px, 16px, or 999px (round).`,
        lines: nonStandardRadiusLines,
      });
    }
  }

  return results;
}

function findLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    let testLine = line;
    // For lines with an opening tag that isn't closed, join subsequent lines
    // so multi-line attributes are visible to the regex
    if (/<[a-zA-Z]/.test(line) && !/>/.test(line)) {
      for (let j = index + 1; j < lines.length && j < index + 15; j++) {
        testLine += ' ' + lines[j];
        if (/>/.test(lines[j])) break;
      }
    }
    if (testLine.match(pattern)) {
      matches.push(index + 1);
    }
  });

  return matches;
}

function generateChecklistReport(componentPath) {
  const baseName = path.basename(componentPath, '.component.ts');
  const dir = path.dirname(componentPath);

  const templatePath = path.join(dir, `${baseName}.component.html`);
  const scssPath = path.join(dir, `${baseName}.component.scss`);

  const checklist = {
    component: baseName,
    template: {
      exists: fs.existsSync(templatePath),
      checks: {
        noInlineStyles: true,
        usesMaterialVariants: true,
        usesMaterialLayout: null, // Can't easily detect
      },
    },
    scss: {
      exists: fs.existsSync(scssPath),
      checks: {
        noNgDeep: true,
        usesDesignTokens: true,
        usesMixins: null, // Would need to parse imports
        noDuplicateUtilities: true,
      },
    },
    general: {
      responsive: null, // Manual check
      themeTested: null, // Manual check
    },
  };

  // Run checks
  if (checklist.template.exists) {
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    const results = checkFile(templatePath, templateContent, true);

    checklist.template.checks.noInlineStyles = results.errors.length === 0;
    checklist.template.checks.usesMaterialVariants = !results.warnings.some(
      (w) => w.rule === 'use-material-buttons' || w.rule === 'use-material-inputs',
    );
  }

  if (checklist.scss.exists) {
    const scssContent = fs.readFileSync(scssPath, 'utf-8');
    const results = checkFile(scssPath, scssContent, false);

    checklist.scss.checks.noNgDeep = !results.errors.some((e) => e.rule === 'no-ng-deep');
    checklist.scss.checks.usesDesignTokens = !results.warnings.some((w) => w.rule === 'use-design-tokens');
  }

  return checklist;
}

function formatChecklistForMarkdown(checklist) {
  const check = (value) => {
    if (value === true) return '✅';
    if (value === false) return '❌';
    return '⚠️ (manual check)';
  };

  return `
## Component: ${checklist.component}

### Component Template:
- ${check(checklist.template.checks.noInlineStyles)} No inline styles (style="...")
- ${check(checklist.template.checks.usesMaterialVariants)} Using Material component variants
- ${check(checklist.template.checks.usesMaterialLayout)} Using Material layout features

### Component SCSS:
- ${check(checklist.scss.checks.noNgDeep)} No ::ng-deep selectors
- ${check(checklist.scss.checks.usesDesignTokens)} Using design tokens
- ${check(checklist.scss.checks.usesMixins)} Using mixins for common patterns
- ${check(checklist.scss.checks.noDuplicateUtilities)} No duplicate utility classes

### General:
- ${check(checklist.general.responsive)} Responsive design considered
- ${check(checklist.general.themeTested)} Light/dark theme tested
`;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--checklist') && args[1]) {
    // Generate checklist for a specific component
    const componentPath = args[1];
    const checklist = generateChecklistReport(componentPath);
    console.log(formatChecklistForMarkdown(checklist));
  } else {
    // Run full scan
    console.log('🔍 MD3 Compliance Checker\n');
    console.log('Scanning for MD3 best practice violations...\n');

    // Scan all component templates (exclude dev showcase components)
    const templateFiles = findFiles('src/app', /\.component\.html$/).filter((f) => !f.includes('/dev/'));
    templateFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const results = checkFile(file, content, true);

      if (results.errors.length > 0 || results.warnings.length > 0) {
        console.log(`\n📄 ${file}`);
        results.errors.forEach((err) => {
          console.log(`  ❌ ERROR: ${err.message}`);
          if (err.lines.length > 0) {
            console.log(`     Lines: ${err.lines.join(', ')}`);
          }
        });
        results.warnings.forEach((warn) => {
          console.log(`  ⚠️  WARNING: ${warn.message}`);
          if (warn.lines.length > 0) {
            console.log(`     Lines: ${warn.lines.join(', ')}`);
          }
        });
      }
    });

    // Scan all component SCSS (exclude dev showcase components)
    const scssFiles = findFiles('src/app', /\.component\.scss$/).filter((f) => !f.includes('/dev/'));
    scssFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const results = checkFile(file, content, false);

      if (results.errors.length > 0 || results.warnings.length > 0) {
        console.log(`\n📄 ${file}`);
        results.errors.forEach((err) => {
          console.log(`  ❌ ERROR: ${err.message}`);
          if (err.lines.length > 0) {
            console.log(`     Lines: ${err.lines.join(', ')}`);
          }
        });
        results.warnings.forEach((warn) => {
          console.log(`  ⚠️  WARNING: ${warn.message}`);
          if (warn.lines.length > 0) {
            console.log(`     Lines: ${warn.lines.join(', ')}`);
          }
        });
      }
    });

    console.log('\n✨ Scan complete!\n');
  }
}

module.exports = { checkFile, generateChecklistReport, formatChecklistForMarkdown };
