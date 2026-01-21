#!/usr/bin/env node
// Copyright (c) 2025-2026 Perpetuator LLC
/**
 * Social Media Preview Checker
 *
 * This script fetches a URL and extracts Open Graph and Twitter Card meta tags
 * to verify how the page will appear when shared on social media.
 *
 * Usage:
 *   node scripts/check-social-preview.cjs <url>
 *   node scripts/check-social-preview.cjs https://capitalcopilot.io/a/HUMN
 *   node scripts/check-social-preview.cjs /a/HUMN  # Uses SITE_URL from environment
 */

const https = require('https');
const http = require('http');

// Load environment for default SITE_URL
let SITE_URL = 'https://capitalcopilot.io';
try {
  const { loadEnvironment } = require('./lib/test-utils.cjs');
  loadEnvironment();
  SITE_URL = process.env.SITE_URL || SITE_URL;
} catch {
  // Ignore if test-utils not available
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialPreviewBot/1.0)',
      },
    };

    const request = client.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        const redirectUrl = response.headers.location.startsWith('http')
          ? response.headers.location
          : new URL(response.headers.location, url).href;
        console.log(`↪ Redirecting to: ${redirectUrl}`);
        return fetchUrl(redirectUrl).then(resolve).catch(reject);
      }

      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => resolve(data));
    });

    request.on('error', reject);
    request.setTimeout(10000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function extractMetaTags(html) {
  const tags = {
    title: null,
    description: null,
    og: {},
    twitter: {},
    other: {},
  };

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    tags.title = titleMatch[1].trim();
  }

  // Extract meta tags
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let match;

  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];

    // Parse attributes - handle both single and double quotes properly
    const nameMatch = attrs.match(/name="([^"]+)"|name='([^']+)'/i);
    const propertyMatch = attrs.match(/property="([^"]+)"|property='([^']+)'/i);
    const contentMatch = attrs.match(/content="([^"]+)"|content='([^']+)'/i);

    const name = nameMatch?.[1] || nameMatch?.[2] || propertyMatch?.[1] || propertyMatch?.[2];
    const content = contentMatch?.[1] || contentMatch?.[2];

    if (!name || !content) continue;

    if (name.startsWith('og:')) {
      tags.og[name.replace('og:', '')] = content;
    } else if (name.startsWith('twitter:')) {
      tags.twitter[name.replace('twitter:', '')] = content;
    } else if (name === 'description') {
      tags.description = content;
    } else {
      tags.other[name] = content;
    }
  }

  return tags;
}

function printPreview(tags, url) {
  const divider = '─'.repeat(60);

  console.log('\n' + divider);
  console.log('📱 SOCIAL MEDIA PREVIEW CHECKER');
  console.log(divider);
  console.log(`🔗 URL: ${url}`);
  console.log(divider);

  // Page Title
  console.log('\n📄 PAGE TITLE:');
  console.log(`   ${tags.title || '(not set)'}`);

  // Meta Description
  console.log('\n📝 META DESCRIPTION:');
  console.log(`   ${tags.description || '(not set)'}`);

  // Open Graph (Facebook, LinkedIn)
  console.log('\n🔵 OPEN GRAPH (Facebook, LinkedIn):');
  console.log(`   Title:       ${tags.og.title || '(not set)'}`);
  console.log(`   Description: ${tags.og.description || '(not set)'}`);
  console.log(`   Image:       ${tags.og.image || '(not set)'}`);
  console.log(`   URL:         ${tags.og.url || '(not set)'}`);
  console.log(`   Type:        ${tags.og.type || '(not set)'}`);
  console.log(`   Site Name:   ${tags.og.site_name || '(not set)'}`);

  // Twitter Card
  console.log('\n🐦 TWITTER CARD (X):');
  console.log(`   Card Type:   ${tags.twitter.card || '(not set)'}`);
  console.log(`   Title:       ${tags.twitter.title || '(not set)'}`);
  console.log(`   Description: ${tags.twitter.description || '(not set)'}`);
  console.log(`   Image:       ${tags.twitter.image || '(not set)'}`);
  console.log(`   Site:        ${tags.twitter.site || '(not set)'}`);

  console.log('\n' + divider);

  // Validation warnings
  const warnings = [];

  if (!tags.og.title) warnings.push('⚠️  Missing og:title');
  if (!tags.og.description) warnings.push('⚠️  Missing og:description');
  if (!tags.og.image) warnings.push('⚠️  Missing og:image');
  if (!tags.twitter.title) warnings.push('⚠️  Missing twitter:title');
  if (!tags.twitter.description) warnings.push('⚠️  Missing twitter:description');
  if (!tags.twitter.image) warnings.push('⚠️  Missing twitter:image');

  if (tags.og.title && tags.og.title.length > 60) {
    warnings.push(`⚠️  og:title too long (${tags.og.title.length} chars, recommend < 60)`);
  }
  if (tags.og.description && tags.og.description.length > 200) {
    warnings.push(`⚠️  og:description too long (${tags.og.description.length} chars, recommend < 200)`);
  }

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach((w) => console.log(`   ${w}`));
  } else {
    console.log('✅ All required meta tags are present!');
  }

  console.log(divider + '\n');

  // Return summary for programmatic use
  return {
    valid: warnings.length === 0,
    warnings,
    tags,
  };
}

async function main() {
  let url = process.argv[2];

  if (!url) {
    console.log('Usage: node scripts/check-social-preview.cjs <url>');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/check-social-preview.cjs https://capitalcopilot.io/a/HUMN');
    console.log('  node scripts/check-social-preview.cjs /a/HUMN');
    console.log('  node scripts/check-social-preview.cjs /home');
    process.exit(1);
  }

  // Handle relative URLs
  if (url.startsWith('/')) {
    url = SITE_URL + url;
  }

  console.log(`\n🔍 Fetching: ${url}`);

  try {
    const html = await fetchUrl(url);
    const tags = extractMetaTags(html);
    const result = printPreview(tags, url);

    process.exit(result.valid ? 0 : 1);
  } catch (error) {
    console.error(`\n❌ Error fetching URL: ${error.message}`);
    process.exit(1);
  }
}

main();
