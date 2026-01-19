/* Copyright (c) 2025 Perpetuator LLC */

/**
 * Favicon Generation Script
 *
 * Generates all favicon formats from a single SVG source file.
 * Uses the `favicons` package for comprehensive favicon generation.
 *
 * Usage: yarn favicon
 *
 * Output files are placed in /public directory:
 * - favicon.ico (multi-size ICO for browsers)
 * - favicon-16x16.png
 * - favicon-32x32.png
 * - apple-touch-icon.png (180x180)
 * - android-chrome-192x192.png
 * - android-chrome-512x512.png
 * - site.webmanifest
 */

const fs = require('fs').promises;
const path = require('path');

// Configuration
const SOURCE_FILE = path.join(__dirname, '../public/favicon-source.svg');
const OUTPUT_DIR = path.join(__dirname, '../public');

const configuration = {
  path: '/', // Path for manifest links
  appName: 'Capital Copilot',
  appShortName: 'CC',
  appDescription: 'AI-powered stock market terminal',
  developerName: 'Perpetuator LLC',
  background: '#2f2f2f', // Match the SVG background
  theme_color: '#2f2f2f',
  display: 'standalone',
  start_url: '/',
  icons: {
    // Generate these icon types
    android: true,        // android-chrome-*.png
    appleIcon: true,      // apple-touch-icon.png
    appleStartup: false,  // Apple startup screens (not needed)
    favicons: true,       // favicon.ico + favicon-*.png
    windows: false,       // Windows tiles (not needed)
    yandex: false         // Yandex browser (not needed)
  }
};

async function generateFavicons() {
  console.log('🎨 Generating favicons from:', SOURCE_FILE);
  console.log('📁 Output directory:', OUTPUT_DIR);
  console.log('');

  try {
    // Verify source file exists
    await fs.access(SOURCE_FILE);
  } catch {
    console.error('❌ Source file not found:', SOURCE_FILE);
    console.error('   Create a favicon source SVG at public/favicon-source.svg');
    process.exit(1);
  }

  try {
    // Dynamic import for ES module
    const faviconsMod = await import('favicons');
    const favicons = faviconsMod.default || faviconsMod.favicons;

    const response = await favicons(SOURCE_FILE, configuration);

    // Write image files
    console.log('📦 Writing image files...');
    for (const image of response.images) {
      const outputPath = path.join(OUTPUT_DIR, image.name);
      await fs.writeFile(outputPath, image.contents);
      console.log(`   ✓ ${image.name}`);
    }

    // Write manifest/config files
    console.log('\n📄 Writing config files...');
    for (const file of response.files) {
      const outputPath = path.join(OUTPUT_DIR, file.name);
      await fs.writeFile(outputPath, file.contents);
      console.log(`   ✓ ${file.name}`);
    }

    // Log HTML to add to index.html
    console.log('\n✅ Favicons generated successfully!');
    console.log('\n📋 Add this to your index.html <head>:\n');
    console.log('<!-- Favicons -->');
    response.html.forEach(line => console.log(line));
    console.log('');

  } catch (error) {
    console.error('❌ Error generating favicons:', error.message);
    process.exit(1);
  }
}

generateFavicons();
