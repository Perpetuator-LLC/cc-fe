// Copyright (c) 2025. Capital Copilot
const fs = require('fs');
const path = require('path');

const currentYear = new Date().getFullYear();
const COPYRIGHT_NOTICE_REGEX_JS_TS = new RegExp(`^\\/\\/ Copyright \\(c\\) ${currentYear}. Capital Copilot$`);
const COPYRIGHT_NOTICE_REGEX_HTML_MD = new RegExp(
  `^<!--\\n  ~ Copyright \\(c\\) ${currentYear}. \\n  ~ All rights reserved. Capital Copilot.\\n  -->$`,
);
const COPYRIGHT_NOTICE_REGEX_CSS = new RegExp(
  `^\\/\\*\\n  ~ Copyright \\(c\\) ${currentYear}. \\n  ~ All rights reserved. Capital Copilot.\\n  \\*\\/$`,
);
const COPYRIGHT_NOTICE_CURRENT_YEAR_JS_TS = `// Copyright (c) ${currentYear}. Capital Copilot`;
const COPYRIGHT_NOTICE_CURRENT_YEAR_HTML_MD = `<!--\n  ~ Copyright (c) ${currentYear}. \n  ~ All rights reserved. Capital Copilot.\n  -->`;
const COPYRIGHT_NOTICE_CURRENT_YEAR_CSS = `/*\n  ~ Copyright (c) ${currentYear}. \n  ~ All rights reserved. Capital Copilot.\n  */`;

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
    file.endsWith('.html') ||
    file.endsWith('.css') ||
    file.endsWith('.scss')
    // file.endsWith('.md')
  ) {
    checkCopyright(file);
  }
});
