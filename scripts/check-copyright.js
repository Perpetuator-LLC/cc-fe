// Copyright (c) 2025 Perpetuator LLC
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
 *   <!--
 *     Copyright (c) 2025 Perpetuator LLC
 *     ...
 *   -->
 */
function hasHTMLCopyright(content) {
  // Check for single-line format
  if (content.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_HTML_MD)) {
    return true;
  }
  if (COPYRIGHT_NOTICE_REGEX_HTML_MD.test(content)) {
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
      if (trimmed.match(/Copyright\s*\(c\)\s*\d{4}\s+Perpetuator\s+LLC/i)) {
        // Extract the year from the line
        const yearMatch = trimmed.match(/Copyright\s*\(c\)\s*(\d{4})/i);
        if (yearMatch) {
          const copyrightYear = parseInt(yearMatch[1]);
          // Accept any year from 2020 onwards (to allow older files)
          if (copyrightYear >= 2020 && copyrightYear <= currentYear) {
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
    if (!content.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_CSS) && !COPYRIGHT_NOTICE_REGEX_CSS.test(content)) {
      console.error(`Missing or incorrect copyright notice in ${filePath}`);
      process.exit(1);
    }
  } else if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
    if (!content.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_JS_TS) && !COPYRIGHT_NOTICE_REGEX_JS_TS.test(content)) {
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
