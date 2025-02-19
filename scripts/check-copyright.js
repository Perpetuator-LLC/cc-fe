// Copyright (c) 2025 Perpetuator LLC
const fs = require('fs');
const path = require('path');

const currentYear = new Date().getFullYear();
const COPYRIGHT_NOTICE_REGEX = new RegExp(`^// Copyright \\(c\\) 20\\d{2}-${currentYear} Perpetuator LLC$`);
const COPYRIGHT_NOTICE_CURRENT_YEAR = `// Copyright (c) ${currentYear} Perpetuator LLC`;

function checkCopyright(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith(COPYRIGHT_NOTICE_CURRENT_YEAR) && !COPYRIGHT_NOTICE_REGEX.test(content)) {
    console.error(`Missing or incorrect copyright notice in ${filePath}`);
    process.exit(1);
  }
}

const files = process.argv.slice(2);
files.forEach((file) => {
  if (file.endsWith('.ts') || file.endsWith('.js')) {
    // console.log('Checking', file);
    checkCopyright(file);
  }
});
