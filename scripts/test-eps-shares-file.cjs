#!/usr/bin/env node
/**
 * Test EPS and Shares Outstanding Data - File Output Version
 * Writes results directly to a file for debugging terminal issues
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const fs = require('fs');
const path = require('path');
const { graphqlQuery } = require('./lib/test-utils.cjs');

const OUTPUT_FILE = path.join(__dirname, '..', 'logs', 'ai_link', 'eps_shares_raw_data.txt');

async function main() {
  const symbol = process.argv[2] || 'NFLX';
  let output = '';

  const log = (msg) => {
    output += msg + '\n';
    console.log(msg);
  };

  log('='.repeat(70));
  log(`EPS & Shares Outstanding Investigation: ${symbol}`);
  log(`Generated: ${new Date().toISOString()}`);
  log('='.repeat(70));
  log('');

  try {
    // Get income statements with EPS
    log('Fetching income statements...');
    const incomeResult = await graphqlQuery(`
      query {
        incomeStatements(ticker: "${symbol}", isAnnual: true, limit: 10) {
          fiscalDateEnding
          totalRevenue
          netIncome
          epsReported
        }
      }
    `);

    // Get balance sheets with shares outstanding
    log('Fetching balance sheets...');
    const balanceResult = await graphqlQuery(`
      query {
        balanceSheets(ticker: "${symbol}", isAnnual: true, limit: 10) {
          fiscalDateEnding
          commonStockSharesOutstanding
          totalEquity
        }
      }
    `);

    log('\n--- RAW INCOME STATEMENT DATA ---');
    log(JSON.stringify(incomeResult.incomeStatements, null, 2));

    log('\n--- RAW BALANCE SHEET DATA ---');
    log(JSON.stringify(balanceResult.balanceSheets, null, 2));

    log('\n--- FORMATTED ANALYSIS ---');
    log('Date'.padEnd(15) + 'EPS Reported'.padStart(15) + 'Net Income'.padStart(15) + 'Shares'.padStart(20));
    log('-'.repeat(65));

    if (incomeResult.incomeStatements) {
      incomeResult.incomeStatements.forEach(is => {
        const matchingBS = balanceResult.balanceSheets?.find(bs =>
          bs.fiscalDateEnding === is.fiscalDateEnding
        );

        const date = is.fiscalDateEnding;
        const eps = is.epsReported !== null && is.epsReported !== undefined
          ? `$${is.epsReported.toFixed(2)}`
          : 'NULL';
        const ni = is.netIncome ? `$${(is.netIncome / 1e9).toFixed(2)}B` : 'NULL';
        const shares = matchingBS?.commonStockSharesOutstanding
          ? `${(matchingBS.commonStockSharesOutstanding / 1e6).toFixed(2)}M`
          : 'NULL';

        log(date.padEnd(15) + eps.padStart(15) + ni.padStart(15) + shares.padStart(20));
      });
    }

    // Check for the split
    log('\n--- SPLIT DETECTION ---');
    if (balanceResult.balanceSheets) {
      const sorted = [...balanceResult.balanceSheets].sort((a, b) =>
        new Date(a.fiscalDateEnding) - new Date(b.fiscalDateEnding)
      );

      let prevShares = null;
      sorted.forEach(bs => {
        if (bs.commonStockSharesOutstanding && prevShares) {
          const change = ((bs.commonStockSharesOutstanding - prevShares) / prevShares * 100);
          if (Math.abs(change) > 50) {
            log(`🚨 MAJOR SHARE CHANGE: ${bs.fiscalDateEnding} - ${change.toFixed(0)}% change`);
            log(`   Previous: ${(prevShares / 1e6).toFixed(2)}M`);
            log(`   Current:  ${(bs.commonStockSharesOutstanding / 1e6).toFixed(2)}M`);
          }
        }
        prevShares = bs.commonStockSharesOutstanding;
      });

      const hasNulls = sorted.some(bs => !bs.commonStockSharesOutstanding);
      if (hasNulls) {
        log('\n⚠️ WARNING: Some years have NULL shares outstanding!');
        log('   This indicates the backend is not returning this data.');
      }
    }

  } catch (err) {
    log(`\nERROR: ${err.message}`);
    log(err.stack);
  }

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, output);
  log(`\nOutput written to: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  fs.writeFileSync(OUTPUT_FILE, `ERROR: ${err.message}\n${err.stack}`);
  process.exit(1);
});

