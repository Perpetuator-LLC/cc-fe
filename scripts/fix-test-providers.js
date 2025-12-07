// Copyright (c) 2025 Perpetuator LLC
/**
 * Script to automatically add common test providers to spec files
 * This fixes missing OAuthService dependency issues in many tests
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files that need common test providers
const filesToFix = [
  'src/app/policy/cookie-banner/cookie-banner.component.spec.ts',
  'src/app/home/home.component.spec.ts',
  'src/app/episode/episodes-list/episodes-list.component.spec.ts',
  'src/app/finance/finance.component.spec.ts',
  'src/app/podcasts-list/podcasts-list.component.spec.ts',
  'src/app/podcast-categories/podcast-categories.component.spec.ts',
  'src/app/policy/terms-and-conditions/terms-and-conditions.component.spec.ts',
  'src/app/teams-list/teams-list.component.spec.ts',
  'src/app/team-detail/team-detail.component.spec.ts',
  'src/app/user-detail/user-detail.component.spec.ts',
  'src/app/new-podcast/new-podcast.component.spec.ts',
  'src/app/jobs-list/jobs-list.component.spec.ts',
  'src/app/orders-list/orders-list.component.spec.ts',
  'src/app/transactions-list/transactions-list.component.spec.ts',
  'src/app/news/news.component.spec.ts',
  'src/app/new-team/new-team.component.spec.ts',
];

function addTestProviders(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');

  // Skip if already has the import
  if (
    content.includes('getCommonTestProviders') ||
    content.includes('getApolloTestProviders') ||
    content.includes('getRouterTestProviders')
  ) {
    console.log(`Skipping ${filePath} - already has test providers`);
    return;
  }

  // Calculate the relative path to testing/test-helpers.ts
  const dir = path.dirname(filePath);
  const depth = dir.split('/').length - 2; // -2 for 'src/app'
  const relativePath = '../'.repeat(depth) + 'testing/test-helpers';

  // Add import after other imports
  const importRegex = /(import.*from.*;\n)(\n*describe)/;
  if (content.match(importRegex)) {
    const hasApollo = content.includes("from 'apollo-angular'");
    const hasActivatedRoute = content.includes("from '@angular/router'") && content.includes('ActivatedRoute');

    let importToAdd;
    if (hasApollo && hasActivatedRoute) {
      importToAdd = `import { getCommonTestProviders } from '${relativePath}';\n`;
    } else if (hasApollo) {
      importToAdd = `import { getCommonTestProviders } from '${relativePath}';\n`;
    } else if (hasActivatedRoute) {
      importToAdd = `import { getRouterTestProviders } from '${relativePath}';\n`;
    } else {
      importToAdd = `import { getCommonTestProviders } from '${relativePath}';\n`;
    }

    content = content.replace(importRegex, `$1${importToAdd}$2`);

    // Add providers to TestBed configuration
    const providersRegex = /(providers:\s*\[)(\s*)/;
    if (content.match(providersRegex)) {
      content = content.replace(providersRegex, '$1\n        ...getCommonTestProviders(),$2');
    }

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Fixed ${filePath}`);
  } else {
    console.log(`⚠ Could not fix ${filePath} - pattern not found`);
  }
}

console.log('Fixing test files...\n');
filesToFix.forEach(addTestProviders);
console.log('\n✅ Done!');
