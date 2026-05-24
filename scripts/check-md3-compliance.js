#!/usr/bin/env node
// Copyright (c) 2025 Perpetuator LLC

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
  genericButton: /<button(?![^>]*mat-)/g,
  genericInput: /<input(?![^>]*matInput)/g,
  ngDeepInTemplate: /::ng-deep/g,

  // SCSS violations
  ngDeepSelector: /::ng-deep/g,
  hardcodedPx: /(?:margin|padding|gap|width|height|font-size|top|left|right|bottom)\s*:\s*(?!0\s|var\()[0-9]+px(?!;)/g,
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
    // Check for inline styles
    const inlineStyleLines = findLineNumbers(fileContent, PATTERNS.inlineStyles);
    if (inlineStyleLines.length > 0) {
      results.errors.push({
        rule: 'no-inline-styles',
        message: `Found ${inlineStyleLines.length} inline style(s). Use component SCSS or Material component variants.`,
        lines: inlineStyleLines,
      });
    }

    // Check for generic buttons (should use Material variants)
    const genericButtonLines = findLineNumbers(fileContent, PATTERNS.genericButton);
    if (genericButtonLines.length > 0) {
      results.warnings.push({
        rule: 'use-material-buttons',
        message: `Found ${genericButtonLines.length} generic button(s). Consider using Material button variants (mat-button, mat-flat-button, mat-raised-button).`,
        lines: genericButtonLines,
      });
    }

    // Check for generic inputs (should use matInput)
    const genericInputLines = findLineNumbers(fileContent, PATTERNS.genericInput);
    if (genericInputLines.length > 0) {
      results.warnings.push({
        rule: 'use-material-inputs',
        message: `Found ${genericInputLines.length} generic input(s). Use matInput directive with mat-form-field.`,
        lines: genericInputLines,
      });
    }
  } else {
    // SCSS checks

    // Check for ::ng-deep
    const ngDeepLines = findLineNumbers(fileContent, PATTERNS.ngDeepSelector);
    if (ngDeepLines.length > 0) {
      results.errors.push({
        rule: 'no-ng-deep',
        message: `Found ${ngDeepLines.length} ::ng-deep selector(s). This is deprecated. Use CSS custom properties or target Material classes directly.`,
        lines: ngDeepLines,
      });
    }

    // Check for hardcoded px values (should use 4px grid)
    const spacingLines = findInvalidSpacingLines(fileContent);
    if (spacingLines.length > 0) {
      results.warnings.push({
        rule: 'use-4px-grid',
        message: `Found ${spacingLines.length} spacing value(s) not on 4px grid. Use MD3 grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64.`,
        lines: spacingLines,
      });
    }

    // Check for hardcoded colors (should use design tokens)
    const hardcodedColorLines = findLineNumbers(fileContent, PATTERNS.hardcodedColors);
    if (hardcodedColorLines.length > 0) {
      results.warnings.push({
        rule: 'use-design-tokens',
        message: `Found ${hardcodedColorLines.length} hardcoded color(s). Use MD3 design tokens (--md-sys-color-*) for theme support.`,
        lines: hardcodedColorLines,
      });
    }

    // Check for rgb/rgba colors
    const rgbLines = findLineNumbers(fileContent, PATTERNS.rgbColors);
    if (rgbLines.length > 0) {
      results.warnings.push({
        rule: 'use-design-tokens',
        message: `Found ${rgbLines.length} rgb/rgba color(s). Use MD3 design tokens (--md-sys-color-*) for theme support.`,
        lines: rgbLines,
      });
    }

    // Check for hardcoded border-radius (allow MD3 values: 4px, 8px, 12px, 16px, 999px)
    const validMd3Radii = [0, 4, 8, 12, 16, 999];
    const invalidRadiusLines = findInvalidBorderRadiusLines(fileContent, validMd3Radii);
    if (invalidRadiusLines.length > 0) {
      results.warnings.push({
        rule: 'use-standard-radius',
        message: `Found ${invalidRadiusLines.length} hardcoded border-radius value(s). Use MD3 values: 4px, 8px, 12px, 16px, or 999px (round).`,
        lines: invalidRadiusLines,
      });
    }
  }

  return results;
}

function findLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    // Skip if previous line contains md3-ignore comment
    if (index > 0 && lines[index - 1].includes('md3-ignore')) {
      return;
    }
    // Skip if current line contains md3-ignore comment
    if (line.includes('md3-ignore')) {
      return;
    }
    if (line.match(pattern)) {
      matches.push(index + 1);
    }
  });

  return matches;
}

function findInvalidBorderRadiusLines(content, validValues) {
  const lines = content.split('\n');
  const matches = [];
  const radiusPattern = /border-radius\s*:\s*([0-9]+)px/;

  lines.forEach((line, index) => {
    // Skip if previous line contains md3-ignore comment
    if (index > 0 && lines[index - 1].includes('md3-ignore')) {
      return;
    }
    // Skip if current line contains md3-ignore comment
    if (line.includes('md3-ignore')) {
      return;
    }
    const match = line.match(radiusPattern);
    if (match) {
      const value = parseInt(match[1]);
      if (!validValues.includes(value)) {
        matches.push(index + 1);
      }
    }
  });

  return matches;
}

function findInvalidSpacingLines(content) {
  const lines = content.split('\n');
  const matches = [];
  const spacingPattern = /(?:margin|padding|gap|top|left|right|bottom)\s*:\s*(?!0\s|var\().*?([0-9]+)px/;

  lines.forEach((line, index) => {
    // Skip if previous line contains md3-ignore comment
    if (index > 0 && lines[index - 1].includes('md3-ignore')) {
      return;
    }
    // Skip if current line contains md3-ignore comment
    if (line.includes('md3-ignore')) {
      return;
    }
    const match = line.match(spacingPattern);
    if (match) {
      const value = parseInt(match[1]);
      // Check if value is on 4px grid (or is 0)
      if (value !== 0 && value % 4 !== 0 && value > 4) {
        matches.push(index + 1);
      }
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
  const strictMode = args.includes('--strict');
  const filesIndex = args.indexOf('--files');

  let hasErrors = false;
  let hasWarnings = false;

  function printResults(file, results) {
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
      if (results.errors.length > 0) hasErrors = true;
      if (results.warnings.length > 0) hasWarnings = true;
    }
  }

  if (args.includes('--checklist') && args[1]) {
    // Generate checklist for a specific component
    const componentPath = args[1];
    const checklist = generateChecklistReport(componentPath);
    console.log(formatChecklistForMarkdown(checklist));
  } else if (filesIndex !== -1) {
    // Check specific files (for lint-staged)
    const files = args.slice(filesIndex + 1).filter(f => !f.startsWith('--'));

    if (files.length === 0) {
      console.log('No files specified for --files mode');
      process.exit(0);
    }

    files.forEach((file) => {
      if (!fs.existsSync(file)) return;

      const content = fs.readFileSync(file, 'utf-8');
      const isTemplate = file.endsWith('.html');
      const results = checkFile(file, content, isTemplate);
      printResults(file, results);
    });

    if (hasErrors || hasWarnings) {
      console.log('');
    }

    // In strict mode, exit with error if there are errors (not warnings)
    if (strictMode && hasErrors) {
      process.exit(1);
    }
  } else {
    // Run full scan
    console.log('🔍 MD3 Compliance Checker\n');
    console.log('Scanning for MD3 best practice violations...\n');

    // Scan all component templates
    const templateFiles = findFiles('src/app', /\.component\.html$/);
    templateFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const results = checkFile(file, content, true);
      printResults(file, results);
    });

    // Scan all component SCSS
    const scssFiles = findFiles('src/app', /\.component\.scss$/);
    scssFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      const results = checkFile(file, content, false);
      printResults(file, results);
    });

    console.log('\n✨ Scan complete!\n');

    // In strict mode, exit with error if there are errors (not warnings)
    if (strictMode && hasErrors) {
      process.exit(1);
    }
  }
}

module.exports = { checkFile, generateChecklistReport, formatChecklistForMarkdown };
