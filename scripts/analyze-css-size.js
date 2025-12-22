#!/usr/bin/env node
// Copyright (c) 2025 Perpetuator LLC

/**
 * CSS Size Analysis Script
 *
 * Analyzes compiled CSS output to track size improvements during MD3 migration.
 * Generates reports showing:
 * - Total compiled CSS size
 * - Size per component
 * - Comparison with previous baseline
 * - Trends over time
 *
 * Usage:
 *   node scripts/analyze-css-size.js              # Analyze current build
 *   node scripts/analyze-css-size.js --baseline   # Save as baseline
 *   node scripts/analyze-css-size.js --dev        # Save as dev snapshot
 *   node scripts/analyze-css-size.js --compare    # Compare dev vs baseline
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const OUTPUT_DIR = path.join(__dirname, '../dist/capital-copilot-fe/browser');
const REPORTS_DIR = path.join(__dirname, '../logs/css-size-reports');
const BASELINE_FILE = path.join(REPORTS_DIR, 'baseline.json');
const DEV_FILE = path.join(REPORTS_DIR, 'current.dev.json');
const HISTORY_FILE = path.join(REPORTS_DIR, 'history.json');

// Ensure reports directory exists
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * Get size of a file in bytes
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Analyze CSS files in dist folder
 */
function analyzeCSSFiles() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    console.error('❌ Build output not found. Please run `yarn build` first.');
    process.exit(1);
  }

  const cssFiles = [];
  let totalSize = 0;

  // Find all CSS files
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (file.endsWith('.css')) {
        const size = getFileSize(fullPath);
        const relativePath = path.relative(OUTPUT_DIR, fullPath);
        cssFiles.push({
          file: relativePath,
          size: size,
          sizeFormatted: formatBytes(size),
        });
        totalSize += size;
      }
    }
  }

  scanDirectory(OUTPUT_DIR);

  // Sort by size descending
  cssFiles.sort((a, b) => b.size - a.size);

  return {
    timestamp: new Date().toISOString(),
    totalSize: totalSize,
    totalSizeFormatted: formatBytes(totalSize),
    files: cssFiles,
    fileCount: cssFiles.length,
  };
}

/**
 * Save report to file
 */
function saveReport(data, filePath) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Report saved to: ${path.relative(process.cwd(), filePath)}`);
}

/**
 * Display report in console
 */
function displayReport(data, title = 'CSS Size Analysis') {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${title}`);
  console.log('='.repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Size: ${data.totalSizeFormatted} (${data.totalSize.toLocaleString()} bytes)`);
  console.log(`   File Count: ${data.fileCount}`);
  console.log(`   Timestamp:  ${new Date(data.timestamp).toLocaleString()}`);

  console.log(`\n📁 Top 10 Largest Files:`);
  const top10 = data.files.slice(0, 10);
  top10.forEach((file, index) => {
    const percent = ((file.size / data.totalSize) * 100).toFixed(1);
    console.log(
      `   ${(index + 1).toString().padStart(2)}. ${file.sizeFormatted.padStart(10)} (${percent.padStart(5)}%) - ${file.file}`,
    );
  });
  console.log('='.repeat(80) + '\n');
}

/**
 * Compare two reports
 */
function compareReports(baseline, current) {
  const diff = current.totalSize - baseline.totalSize;
  const percentChange = ((diff / baseline.totalSize) * 100).toFixed(2);
  const isImprovement = diff < 0;

  console.log('\n' + '='.repeat(80));
  console.log('  📊 CSS Size Comparison: Dev vs Baseline');
  console.log('='.repeat(80));

  console.log(`\n📈 Overall Change:`);
  console.log(`   Baseline:  ${baseline.totalSizeFormatted} (${new Date(baseline.timestamp).toLocaleDateString()})`);
  console.log(`   Current:   ${current.totalSizeFormatted} (${new Date(current.timestamp).toLocaleDateString()})`);
  console.log(`   Difference: ${isImprovement ? '✅' : '⚠️ '} ${formatBytes(Math.abs(diff))} (${percentChange}%)`);

  if (isImprovement) {
    console.log(`   🎉 Great! CSS size reduced by ${formatBytes(Math.abs(diff))}!`);
  } else {
    console.log(`   ⚠️  CSS size increased by ${formatBytes(diff)}`);
  }

  // File count comparison
  const fileCountDiff = current.fileCount - baseline.fileCount;
  console.log(`\n📁 File Count:`);
  console.log(`   Baseline: ${baseline.fileCount}`);
  console.log(`   Current:  ${current.fileCount} (${fileCountDiff >= 0 ? '+' : ''}${fileCountDiff})`);

  // Per-file comparison for common files
  console.log(`\n📋 File-by-File Changes (Top 10):`);
  const baselineMap = new Map(baseline.files.map((f) => [f.file, f]));
  const changes = [];

  for (const currentFile of current.files) {
    const baselineFile = baselineMap.get(currentFile.file);
    if (baselineFile) {
      const fileDiff = currentFile.size - baselineFile.size;
      const filePercent = ((fileDiff / baselineFile.size) * 100).toFixed(1);
      changes.push({
        file: currentFile.file,
        diff: fileDiff,
        percent: filePercent,
        current: currentFile.size,
        baseline: baselineFile.size,
      });
    }
  }

  changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  changes.slice(0, 10).forEach((change, index) => {
    const icon = change.diff < 0 ? '✅' : change.diff > 0 ? '⚠️ ' : '  ';
    const sign = change.diff >= 0 ? '+' : '';
    console.log(
      `   ${(index + 1).toString().padStart(2)}. ${icon} ${sign}${formatBytes(change.diff).padStart(10)} (${sign}${change.percent.padStart(6)}%) - ${change.file}`,
    );
  });

  console.log('='.repeat(80) + '\n');
}

/**
 * Get current git commit hash
 */
function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Get current git branch
 */
function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Update history log
 */
function updateHistory(data) {
  let history = [];
  if (fs.existsSync(HISTORY_FILE)) {
    history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }

  history.push({
    timestamp: data.timestamp,
    totalSize: data.totalSize,
    totalSizeFormatted: formatBytes(data.totalSize),
    fileCount: data.fileCount,
    commit: getGitCommit(),
    branch: getGitBranch(),
  });

  // Keep last 100 entries
  if (history.length > 100) {
    history = history.slice(-100);
  }

  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const isBaseline = args.includes('--baseline');
  const isDev = args.includes('--dev');
  const isCompare = args.includes('--compare');

  console.log('🔍 Analyzing compiled CSS files...\n');

  const currentData = analyzeCSSFiles();

  if (isBaseline) {
    // Save as baseline
    displayReport(currentData, 'CSS Size Analysis - Baseline');
    saveReport(currentData, BASELINE_FILE);
    updateHistory(currentData);
    console.log('✅ Baseline snapshot saved!');
  } else if (isDev) {
    // Save as dev snapshot
    displayReport(currentData, 'CSS Size Analysis - Dev Snapshot');
    saveReport(currentData, DEV_FILE);
    console.log('✅ Dev snapshot saved!');

    // Auto-compare if baseline exists
    if (fs.existsSync(BASELINE_FILE)) {
      const baselineData = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
      compareReports(baselineData, currentData);
    }
  } else if (isCompare) {
    // Compare dev vs baseline
    if (!fs.existsSync(BASELINE_FILE)) {
      console.error('❌ No baseline found. Run with --baseline first.');
      process.exit(1);
    }
    if (!fs.existsSync(DEV_FILE)) {
      console.error('❌ No dev snapshot found. Run with --dev first.');
      process.exit(1);
    }

    const baselineData = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
    const devData = JSON.parse(fs.readFileSync(DEV_FILE, 'utf8'));
    compareReports(baselineData, devData);
  } else {
    // Just display current analysis
    displayReport(currentData);

    // Compare with baseline if it exists
    if (fs.existsSync(BASELINE_FILE)) {
      const baselineData = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
      compareReports(baselineData, currentData);
    }
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { analyzeCSSFiles, compareReports };
