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
    const inlineStyleMatches = fileContent.match(PATTERNS.inlineStyles);
    if (inlineStyleMatches) {
      results.errors.push({
        rule: 'no-inline-styles',
        message: `Found ${inlineStyleMatches.length} inline style(s). Use component SCSS or Material component variants.`,
        lines: findLineNumbers(fileContent, PATTERNS.inlineStyles),
      });
    }

    // Check for generic buttons (should use Material variants)
    const genericButtonMatches = fileContent.match(PATTERNS.genericButton);
    if (genericButtonMatches) {
      results.warnings.push({
        rule: 'use-material-buttons',
        message: `Found ${genericButtonMatches.length} generic button(s). Consider using Material button variants (mat-button, mat-flat-button, mat-raised-button).`,
        lines: findLineNumbers(fileContent, PATTERNS.genericButton),
      });
    }

    // Check for generic inputs (should use matInput)
    const genericInputMatches = fileContent.match(PATTERNS.genericInput);
    if (genericInputMatches) {
      results.warnings.push({
        rule: 'use-material-inputs',
        message: `Found ${genericInputMatches.length} generic input(s). Use matInput directive with mat-form-field.`,
        lines: findLineNumbers(fileContent, PATTERNS.genericInput),
      });
    }
  } else {
    // SCSS checks

    // Check for ::ng-deep
    const ngDeepMatches = fileContent.match(PATTERNS.ngDeepSelector);
    if (ngDeepMatches) {
      results.errors.push({
        rule: 'no-ng-deep',
        message: `Found ${ngDeepMatches.length} ::ng-deep selector(s). This is deprecated. Use CSS custom properties or target Material classes directly.`,
        lines: findLineNumbers(fileContent, PATTERNS.ngDeepSelector),
      });
    }

    // Check for hardcoded px values (should use 4px grid)
    const hardcodedPxMatches = fileContent.match(PATTERNS.hardcodedPx);
    if (hardcodedPxMatches) {
      const nonGridValues = hardcodedPxMatches.filter((match) => {
        const value = parseInt(match.match(/[0-9]+/)[0]);
        return value !== 0 && value % 4 !== 0 && value > 4;
      });

      if (nonGridValues.length > 0) {
        results.warnings.push({
          rule: 'use-4px-grid',
          message: `Found ${nonGridValues.length} spacing value(s) not on 4px grid. Use MD3 grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64.`,
          lines: findLineNumbers(fileContent, PATTERNS.hardcodedPx),
        });
      }
    }

    // Check for hardcoded colors (should use design tokens)
    const hardcodedColorMatches = fileContent.match(PATTERNS.hardcodedColors);
    if (hardcodedColorMatches) {
      results.warnings.push({
        rule: 'use-design-tokens',
        message: `Found ${hardcodedColorMatches.length} hardcoded color(s). Use MD3 design tokens (--md-sys-color-*) for theme support.`,
        lines: findLineNumbers(fileContent, PATTERNS.hardcodedColors),
      });
    }

    // Check for rgb/rgba colors
    const rgbMatches = fileContent.match(PATTERNS.rgbColors);
    if (rgbMatches) {
      results.warnings.push({
        rule: 'use-design-tokens',
        message: `Found ${rgbMatches.length} rgb/rgba color(s). Use MD3 design tokens (--md-sys-color-*) for theme support.`,
        lines: findLineNumbers(fileContent, PATTERNS.rgbColors),
      });
    }

    // Check for hardcoded border-radius
    const hardcodedRadiusMatches = fileContent.match(PATTERNS.hardcodedRadius);
    if (hardcodedRadiusMatches) {
      results.warnings.push({
        rule: 'use-standard-radius',
        message: `Found ${hardcodedRadiusMatches.length} hardcoded border-radius value(s). Use MD3 values: 4px, 8px, 12px, 16px, or 999px (round).`,
        lines: findLineNumbers(fileContent, PATTERNS.hardcodedRadius),
      });
    }
  }

  return results;
}

function findLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const matches = [];

  lines.forEach((line, index) => {
    if (line.match(pattern)) {
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

    // Scan all component templates
    const templateFiles = findFiles('src/app', /\.component\.html$/);
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

    // Scan all component SCSS
    const scssFiles = findFiles('src/app', /\.component\.scss$/);
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
