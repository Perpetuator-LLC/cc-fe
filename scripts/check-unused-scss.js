#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC

/**
 * Dead SCSS/CSS Detection Script
 *
 * Analyzes component SCSS files to detect unused CSS classes.
 *
 * Usage:
 *   node scripts/check-unused-scss.js              # Check all components
 *   node scripts/check-unused-scss.js --details    # Show detailed report
 *   node scripts/check-unused-scss.js --component=home  # Check specific component
 *   node scripts/check-unused-scss.js --strict     # Exit with error if unused found
 *   node scripts/check-unused-scss.js --files file1.scss file2.scss  # Check specific files (for pre-commit)
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src/app');
const REPORTS_DIR = path.join(__dirname, '../logs');
const REPORT_FILE = path.join(REPORTS_DIR, 'unused-scss.log');

// CLI args
const args = process.argv.slice(2);
const isStrict = args.includes('--strict');
const showDetails = args.includes('--fix') || args.includes('--details');
const componentArg = args.find((a) => a.startsWith('--component='));
const targetComponent = componentArg ? componentArg.split('=')[1] : null;
const filesArgIndex = args.indexOf('--files');
const specificFiles = filesArgIndex !== -1 ? args.slice(filesArgIndex + 1).filter((f) => !f.startsWith('--')) : [];

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Find component from a specific SCSS file path
 */
function findComponentFromFile(scssPath) {
  const absolutePath = path.resolve(scssPath);

  // Only process .component.scss files
  if (!absolutePath.endsWith('.component.scss')) {
    return null;
  }

  const dir = path.dirname(absolutePath);
  const baseName = path.basename(absolutePath).replace('.component.scss', '');
  const htmlFile = path.join(dir, `${baseName}.component.html`);
  const tsFile = path.join(dir, `${baseName}.component.ts`);

  if (!fs.existsSync(htmlFile)) {
    return null;
  }

  return {
    name: baseName,
    dir: dir,
    scss: absolutePath,
    html: htmlFile,
    ts: tsFile,
  };
}

/**
 * Find all component directories with both .scss and .html files
 */
function findComponents(dir, components = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Check if this directory has matching .component.scss and .component.html
      const dirFiles = fs.readdirSync(fullPath);
      const scssFiles = dirFiles.filter((f) => f.endsWith('.component.scss'));
      const htmlFiles = dirFiles.filter((f) => f.endsWith('.component.html'));

      for (const scssFile of scssFiles) {
        const baseName = scssFile.replace('.component.scss', '');
        const htmlFile = `${baseName}.component.html`;

        if (htmlFiles.includes(htmlFile)) {
          const componentName = baseName;
          if (!targetComponent || componentName.includes(targetComponent)) {
            components.push({
              name: componentName,
              dir: fullPath,
              scss: path.join(fullPath, scssFile),
              html: path.join(fullPath, htmlFile),
              ts: path.join(fullPath, `${baseName}.component.ts`),
            });
          }
        }
      }

      // Recursively search subdirectories
      findComponents(fullPath, components);
    }
  }

  return components;
}

/**
 * Extract CSS class names from SCSS file (basic parsing)
 */
function extractCSSClasses(scssContent) {
  const classes = new Set();

  // Match class selectors: .class-name
  const classRegex = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
  let match;

  while ((match = classRegex.exec(scssContent)) !== null) {
    const className = match[1];
    // Skip Material/Angular classes and common utilities
    // Also skip Mermaid-generated SVG classes (dynamically injected)
    const mermaidClasses = [
      'node',
      'nodeLabel',
      'edgePath',
      'arrowheadPath',
      'edgeLabel',
      'active',
      'inactive',
      'under-review',
      'review',
      'flowchart-node-root',
    ];
    if (
      !className.startsWith('mat-') &&
      !className.startsWith('mdc-') &&
      !className.startsWith('cdk-') &&
      !className.startsWith('ng-') &&
      !mermaidClasses.includes(className) &&
      className !== 'scss' &&
      className !== 'css'
    ) {
      classes.add(className);
    }
  }

  return Array.from(classes);
}

/**
 * Check if a class is used in HTML or TS template
 */
function isClassUsed(className, htmlContent, tsContent) {
  // Check in HTML for class="..." or [class]="..." or [ngClass]
  const htmlPatterns = [
    new RegExp(`class="[^"]*\\b${className}\\b[^"]*"`, 'i'),
    new RegExp(`\\[class\\.${className}\\]`, 'i'),
    new RegExp(`\\[ngClass]="[^"]*'${className}'[^"]*"`, 'i'),
    new RegExp(`\\[ngClass]="[^"]*"${className}"[^"]*"`, 'i'),
    new RegExp(`#${className}\\b`, 'i'), // Template reference
  ];

  for (const pattern of htmlPatterns) {
    if (pattern.test(htmlContent)) {
      return true;
    }
  }

  // Check for dynamic [ngClass]="variable" patterns where variable could be className
  // This handles cases like [ngClass]="message.type" where type could be 'error', 'warning', etc.
  if (htmlContent.includes('[ngClass]')) {
    // Common dynamic class patterns - these are likely set programmatically
    const dynamicClasses = ['error', 'warning', 'info', 'success', 'pending', 'active', 'inactive', 'disabled'];
    if (dynamicClasses.includes(className)) {
      return true;
    }

    // Detect string concatenation patterns like [ngClass]="'prefix-' + expr"
    // If className starts with a prefix used in concatenation, treat it as dynamic
    const concatPrefixRegex = /\[ngClass\]="'([a-zA-Z_-]+)-'\s*\+/g;
    let concatMatch;
    while ((concatMatch = concatPrefixRegex.exec(htmlContent)) !== null) {
      if (className.startsWith(concatMatch[1] + '-')) {
        return true;
      }
    }
  }

  // Check in TS for template strings or classList manipulation
  if (tsContent) {
    const tsPatterns = [new RegExp(`['"\`]${className}['"\`]`, 'i'), new RegExp(`classList.*${className}`, 'i')];

    for (const pattern of tsPatterns) {
      if (pattern.test(tsContent)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Analyze a single component for unused styles
 */
function analyzeComponent(component) {
  const scssContent = fs.readFileSync(component.scss, 'utf-8');
  const htmlContent = fs.readFileSync(component.html, 'utf-8');
  const tsContent = fs.existsSync(component.ts) ? fs.readFileSync(component.ts, 'utf-8') : '';

  const definedClasses = extractCSSClasses(scssContent);
  const unusedClasses = [];

  for (const className of definedClasses) {
    // Also check if it's a nested selector used within the component
    const isNestedOrPseudo = scssContent.includes(`&.${className}`) || scssContent.includes(`&:${className}`);

    if (!isClassUsed(className, htmlContent, tsContent) && !isNestedOrPseudo) {
      // Additional check: is it used as a host class or global?
      const isHostClass = scssContent.includes(`:host(.${className})`);
      const isGlobalImport = scssContent.includes(`@use`) && scssContent.includes(className);

      if (!isHostClass && !isGlobalImport) {
        unusedClasses.push(className);
      }
    }
  }

  return {
    component: component.name,
    path: path.relative(SRC_DIR, component.dir),
    totalClasses: definedClasses.length,
    unusedClasses: unusedClasses,
    unusedCount: unusedClasses.length,
  };
}

/**
 * Generate report
 */
function generateReport(results) {
  const withUnused = results.filter((r) => r.unusedCount > 0);
  const totalUnused = withUnused.reduce((sum, r) => sum + r.unusedCount, 0);

  let report = `# Unused SCSS Classes Report\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `## Summary\n`;
  report += `- Components analyzed: ${results.length}\n`;
  report += `- Components with unused classes: ${withUnused.length}\n`;
  report += `- Total unused classes: ${totalUnused}\n\n`;

  if (withUnused.length > 0) {
    report += `## Components with Unused Classes\n\n`;

    // Sort by unused count descending
    withUnused.sort((a, b) => b.unusedCount - a.unusedCount);

    for (const result of withUnused) {
      report += `### ${result.component} (${result.unusedCount} unused)\n`;
      report += `Path: \`${result.path}\`\n`;
      report += `Classes: ${result.unusedClasses.map((c) => `\`.${c}\``).join(', ')}\n\n`;
    }
  }

  return report;
}

/**
 * Main execution
 */
async function main() {
  let components;

  // If specific files are provided (pre-commit mode), only check those
  if (specificFiles.length > 0) {
    components = specificFiles.map((f) => findComponentFromFile(f)).filter((c) => c !== null);

    if (components.length === 0) {
      // No component SCSS files to check
      process.exit(0);
    }

    console.log(`🔍 Checking ${components.length} modified component(s) for unused SCSS...\n`);
  } else {
    console.log('🔍 Scanning for unused SCSS classes...\n');
    components = findComponents(SRC_DIR);
    console.log(`Found ${components.length} components to analyze\n`);
  }

  const results = [];

  for (const component of components) {
    try {
      const result = analyzeComponent(component);
      results.push(result);

      if (result.unusedCount > 0) {
        console.log(`⚠️  ${result.component}: ${result.unusedCount} potentially unused class(es)`);
        if (showDetails || specificFiles.length > 0) {
          console.log(`   Classes: ${result.unusedClasses.join(', ')}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error analyzing ${component.name}: ${error.message}`);
    }
  }

  const withUnused = results.filter((r) => r.unusedCount > 0);
  const totalUnused = withUnused.reduce((sum, r) => sum + r.unusedCount, 0);

  // Only show full summary for full scans, not pre-commit
  if (specificFiles.length === 0) {
    console.log('\n' + '='.repeat(60) + '\n');
    console.log(`📊 Summary:`);
    console.log(`   Components analyzed: ${results.length}`);
    console.log(`   Components with unused classes: ${withUnused.length}`);
    console.log(`   Total potentially unused classes: ${totalUnused}`);

    // Save report only for full scans
    const report = generateReport(results);
    fs.writeFileSync(REPORT_FILE, report);
    console.log(`\n📄 Full report saved to: ${REPORT_FILE}`);
  }

  if (isStrict && totalUnused > 0) {
    if (specificFiles.length > 0) {
      console.log('\n❌ Unused SCSS classes detected in staged files!');
      console.log('   Remove unused classes before committing.');
    } else {
      console.log('\n❌ Strict mode: Failing due to unused SCSS classes');
    }
    process.exit(1);
  }

  if (totalUnused === 0) {
    if (specificFiles.length > 0) {
      console.log('✅ No unused SCSS classes in staged files');
    } else {
      console.log('\n✅ No unused SCSS classes detected!');
    }
  } else if (specificFiles.length === 0) {
    console.log('\n⚠️  Review the above classes - some may be dynamically applied');
    console.log('   Use --strict flag to fail the build on unused classes');
  }
}

main().catch(console.error);
