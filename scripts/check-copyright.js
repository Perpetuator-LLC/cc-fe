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

function checkCopyright(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (filePath.endsWith('.html') || filePath.endsWith('.md')) {
    if (!content.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR_HTML_MD) && !COPYRIGHT_NOTICE_REGEX_HTML_MD.test(content)) {
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
    file.endsWith('.html')
    // || file.endsWith('.md')
    // || file.endsWith('.css')
    // || file.endsWith('.scss')
  ) {
    checkCopyright(file);
  }
});
