// Copyright (c) 2025-2026 Perpetuator LLC
const fs = require('fs');
const path = require('path');

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

function checkCopyright(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.html') || filePath.endsWith('.md')) {
    if (!hasHTMLCopyright(content)) {
      console.error(`Missing or incorrect copyright notice in ${filePath}`);
      process.exit(1);
    }
  } else if (filePath.endsWith('.css') || filePath.endsWith('.scss')) {
    // Check first line for copyright (supports both single year and year range)
    const firstLine = content.split('\n')[0] || '';
    if (!firstLine.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_CSS) && !COPYRIGHT_NOTICE_REGEX_CSS.test(firstLine)) {
      console.error(`Missing or incorrect copyright notice in ${filePath}`);
      process.exit(1);
    }
  } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    // Allow shebang line before copyright notice
    const lines = content.split('\n');
    let copyrightLineIndex = 0;

    // If first line is shebang, check second line for copyright
    if (lines[0].trim().startsWith('#!')) {
      copyrightLineIndex = 1;
    }

    const copyrightLine = lines[copyrightLineIndex] || '';

    if (
      !copyrightLine.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_JS_TS) &&
      !COPYRIGHT_NOTICE_REGEX_JS_TS.test(copyrightLine)
    ) {
      console.error(`Missing or incorrect copyright notice in ${filePath}`);
      process.exit(1);
    }
  }
}

const files = process.argv.slice(2);
files.forEach((file) => {
  if (
    file.endsWith('.ts') ||
    file.endsWith('.js') ||
    file.endsWith('.html') ||
    file.endsWith('.css') ||
    file.endsWith('.scss')
    // file.endsWith('.md')
  ) {
    checkCopyright(file);
  }
});
