// Copyright (c) 2025-2026 Perpetuator LLC
const fs = require('fs');

const currentYear = new Date().getFullYear();
const COPYRIGHT_NOTICE_REGEX_JS_TS = new RegExp(`^\\/\\/ Copyright \\(c\\) 20\\d{2}-${currentYear} Perpetuator LLC$`);
const COPYRIGHT_NOTICE_REGEX_HTML_MD = new RegExp(
  `^<!-- Copyright \\(c\\) 20\\d{2}-${currentYear} Perpetuator LLC -->$`,
);
const COPYRIGHT_NOTICE_REGEX_CSS = new RegExp(
  `^\\/\\* Copyright \\(c\\) 20\\d{2}-${currentYear} Perpetuator LLC \\*\\/$`,
);
const COPYRIGHT_NOTICE_CURRENT_YEAR_JS_TS = `// Copyright (c) ${currentYear} Perpetuator LLC`;
const COPYRIGHT_NOTICE_CURRENT_YEAR_HTML_MD = `<!-- Copyright (c) ${currentYear} Perpetuator LLC -->`;
const COPYRIGHT_NOTICE_CURRENT_YEAR_CSS = `/* Copyright (c) ${currentYear} Perpetuator LLC */`;

// Regex to match any copyright line (for fixing)
const COPYRIGHT_ANY_JS_TS = /^\/\/ Copyright \(c\) (\d{4})(-\d{4})? Perpetuator LLC$/;
const COPYRIGHT_ANY_CSS = /^\/\* Copyright \(c\) (\d{4})(-\d{4})? Perpetuator LLC \*\/$/;
const COPYRIGHT_ANY_HTML = /^<!-- Copyright \(c\) (\d{4})(-\d{4})? Perpetuator LLC -->$/;

/**
 * Check if HTML/Markdown file has copyright in multi-line comment format
 * Handles both:
 *   <!-- Copyright (c) 2025 Perpetuator LLC -->
 *   <!-- Copyright (c) 2025-2026 Perpetuator LLC -->
 *   <!--
 *     Copyright (c) 2025 Perpetuator LLC
 *     ...
 *   -->
 */
function hasHTMLCopyright(content) {
  const firstLine = content.split('\n')[0] || '';

  // Check for single-line format with current year only
  if (firstLine.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_HTML_MD)) {
    return true;
  }

  // Check for single-line format with year range (e.g., 2025-2026)
  if (COPYRIGHT_NOTICE_REGEX_HTML_MD.test(firstLine)) {
    return true;
  }

  // Check for multi-line format
  // Must start with <!-- and contain "Copyright (c) 20XX Perpetuator LLC" within first few lines
  const lines = content.split('\n').slice(0, 20); // Check first 20 lines
  const firstLineTrimmed = lines[0].trim();

  if (firstLineTrimmed.startsWith('<!--')) {
    // Look for copyright line within the comment block
    for (const line of lines) {
      const trimmed = line.trim();
      // Check if this line contains the copyright notice (ignoring extra whitespace)
      // Support both single year and year range formats
      if (trimmed.match(/Copyright\s*\(c\)\s*(\d{4}(-\d{4})?)\s+Perpetuator\s+LLC/i)) {
        // Extract the ending year from the line (handles both "2025" and "2025-2026")
        const yearMatch = trimmed.match(/Copyright\s*\(c\)\s*(\d{4})(-(\d{4}))?/i);
        if (yearMatch) {
          // Use the end year if it's a range, otherwise use the single year
          const copyrightYear = parseInt(yearMatch[3] || yearMatch[1]);
          // Accept if the ending year matches current year
          if (copyrightYear === currentYear) {
            return true;
          }
        }
      }
      // Stop at end of comment
      if (trimmed.endsWith('-->')) {
        break;
      }
    }
  }

  return false;
}

/**
 * Check if a file has a valid copyright notice
 * @returns {boolean} true if valid, false if missing or incorrect
 */
function checkCopyright(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.html') || filePath.endsWith('.md')) {
    return hasHTMLCopyright(content);
  } else if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
    // Check first line for copyright (supports both single year and year range)
    const firstLine = content.split('\n')[0] || '';
    return firstLine.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_CSS) || COPYRIGHT_NOTICE_REGEX_CSS.test(firstLine);
  } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    // Allow shebang line before copyright notice
    const lines = content.split('\n');
    let copyrightLineIndex = 0;

    // If first line is shebang, check second line for copyright
    if (lines[0].trim().startsWith('#!')) {
      copyrightLineIndex = 1;
    }

    const copyrightLine = lines[copyrightLineIndex] || '';

    return (
      copyrightLine.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_JS_TS) || COPYRIGHT_NOTICE_REGEX_JS_TS.test(copyrightLine)
    );
  }
  return true; // Unknown file type, assume valid
}

/**
 * Fix or add copyright notice to a file
 * @returns {string} action taken: 'added', 'updated', or 'unchanged'
 */
function fixCopyright(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let newContent;
  let action = 'unchanged';

  if (filePath.endsWith('.html') || filePath.endsWith('.md')) {
    const firstLine = lines[0] || '';
    const match = firstLine.match(COPYRIGHT_ANY_HTML);

    if (match) {
      // Has copyright - update it
      const startYear = match[1];
      const newCopyright =
        startYear === String(currentYear)
          ? `<!-- Copyright (c) ${currentYear} Perpetuator LLC -->`
          : `<!-- Copyright (c) ${startYear}-${currentYear} Perpetuator LLC -->`;
      lines[0] = newCopyright;
      action = 'updated';
    } else if (!hasHTMLCopyright(content)) {
      // No copyright - add it
      lines.unshift(`<!-- Copyright (c) ${currentYear} Perpetuator LLC -->`);
      action = 'added';
    }
    newContent = lines.join('\n');
  } else if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
    const firstLine = lines[0] || '';
    const match = firstLine.match(COPYRIGHT_ANY_CSS);

    if (match) {
      // Has copyright - update it
      const startYear = match[1];
      const newCopyright =
        startYear === String(currentYear)
          ? `/* Copyright (c) ${currentYear} Perpetuator LLC */`
          : `/* Copyright (c) ${startYear}-${currentYear} Perpetuator LLC */`;
      lines[0] = newCopyright;
      action = 'updated';
    } else {
      // No copyright - add it
      lines.unshift(`/* Copyright (c) ${currentYear} Perpetuator LLC */`);
      action = 'added';
    }
    newContent = lines.join('\n');
  } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    let copyrightLineIndex = 0;

    // If first line is shebang, copyright goes on second line
    if (lines[0] && lines[0].trim().startsWith('#!')) {
      copyrightLineIndex = 1;
    }

    const copyrightLine = lines[copyrightLineIndex] || '';
    const match = copyrightLine.match(COPYRIGHT_ANY_JS_TS);

    if (match) {
      // Has copyright - update it
      const startYear = match[1];
      const newCopyright =
        startYear === String(currentYear)
          ? `// Copyright (c) ${currentYear} Perpetuator LLC`
          : `// Copyright (c) ${startYear}-${currentYear} Perpetuator LLC`;
      lines[copyrightLineIndex] = newCopyright;
      action = 'updated';
    } else {
      // No copyright - add it at the appropriate position
      lines.splice(copyrightLineIndex, 0, `// Copyright (c) ${currentYear} Perpetuator LLC`);
      action = 'added';
    }
    newContent = lines.join('\n');
  }

  if (newContent && action !== 'unchanged') {
    fs.writeFileSync(filePath, newContent, 'utf8');
  }

  return action;
}

// Parse arguments
const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const files = args.filter((arg) => !arg.startsWith('--'));

const failingFiles = [];
const fixedFiles = { added: [], updated: [] };

files.forEach((file) => {
  if (
    file.endsWith('.ts') ||
    file.endsWith('.js') ||
    file.endsWith('.html') ||
    file.endsWith('.css') ||
    file.endsWith('.scss')
    // file.endsWith('.md')
  ) {
    if (!checkCopyright(file)) {
      if (fixMode) {
        const action = fixCopyright(file);
        if (action === 'added') {
          fixedFiles.added.push(file);
        } else if (action === 'updated') {
          fixedFiles.updated.push(file);
        }
      } else {
        failingFiles.push(file);
      }
    }
  }
});

// Report results
if (fixMode) {
  const totalFixed = fixedFiles.added.length + fixedFiles.updated.length;
  if (totalFixed > 0) {
    console.log(`\nFixed copyright notices in ${totalFixed} file(s):\n`);
    if (fixedFiles.added.length > 0) {
      console.log(`  Added (${fixedFiles.added.length}):`);
      fixedFiles.added.forEach((file) => {
        console.log(`    + ${file}`);
      });
    }
    if (fixedFiles.updated.length > 0) {
      console.log(`  Updated (${fixedFiles.updated.length}):`);
      fixedFiles.updated.forEach((file) => {
        console.log(`    ~ ${file}`);
      });
    }
    console.log('\nPlease stage the fixed files and commit again.\n');
    process.exit(1); // Exit with error so pre-commit fails and requires re-stage
  }
} else {
  // Check mode - report failures
  if (failingFiles.length > 0) {
    console.error(`\nMissing or incorrect copyright notice in ${failingFiles.length} file(s):\n`);
    failingFiles.forEach((file) => {
      console.error(`  ${file}`);
    });
    console.error(`\nExpected format:`);
    console.error(`  TypeScript/JavaScript: // Copyright (c) ${currentYear} Perpetuator LLC`);
    console.error(`  CSS/SCSS: /* Copyright (c) ${currentYear} Perpetuator LLC */`);
    console.error(`  HTML: <!-- Copyright (c) ${currentYear} Perpetuator LLC -->`);
    console.error(`\nRun with --fix to automatically add/update copyright notices.\n`);
    process.exit(1);
  }
}
