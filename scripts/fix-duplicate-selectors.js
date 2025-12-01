#!/usr/bin/env node
// Copyright (c) 2025 Perpetuator LLC

const fs = require('fs');
const path = require('path');

// List of files with known duplicate selector issues
const filesToFix = [
  'src/app/affiliate-dashboard/affiliate-dashboard.component.scss',
  'src/app/episode-detail/episode-detail.component.scss',
  'src/app/news/news.component.scss',
  'src/app/podcast-detail/podcast-detail.component.scss',
  'src/app/transactions-list/transactions-list.component.scss',
];

function removeDuplicateSelectors(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Track seen selectors with their line numbers
  const seenSelectors = new Map();
  const duplicateRanges = [];

  // Simple selector detection (this is a basic implementation)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check for selector lines (start with . or # or element name, followed by { or space)
    if (line.match(/^[\.\#\w\-]+(\s+|{)/)) {
      const selector = line.split('{')[0].trim();

      if (seenSelectors.has(selector)) {
        // Found duplicate - mark this range for removal
        const originalLine = seenSelectors.get(selector);
        console.log(`  Found duplicate "${selector}" at line ${i + 1} (original at ${originalLine + 1})`);

        // Find the end of this duplicate block
        let endLine = i;
        let braceCount = 0;
        for (let j = i; j < lines.length; j++) {
          const l = lines[j];
          braceCount += (l.match(/{/g) || []).length;
          braceCount -= (l.match(/}/g) || []).length;

          if (braceCount === 0 && j > i) {
            endLine = j;
            break;
          }
        }

        duplicateRanges.push({ start: i, end: endLine });
      } else {
        seenSelectors.set(selector, i);
      }
    }
  }

  // Remove duplicate ranges (in reverse order to maintain line numbers)
  duplicateRanges.sort((a, b) => b.start - a.start);

  for (const range of duplicateRanges) {
    lines.splice(range.start, range.end - range.start + 1);
  }

  if (duplicateRanges.length > 0) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`✓ Fixed ${duplicateRanges.length} duplicate selector(s) in ${filePath}`);
  } else {
    console.log(`✓ No duplicates found in ${filePath}`);
  }
}

console.log('Fixing duplicate selectors...\n');

for (const file of filesToFix) {
  console.log(`Checking ${file}...`);
  removeDuplicateSelectors(file);
  console.log('');
}

console.log('Done!');
