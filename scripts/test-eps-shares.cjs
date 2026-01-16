#!/usr/bin/env node
/**
 * Test EPS and Shares Outstanding Data
 * Investigates data quality issues with EPS and share count
 *
 * Usage: node scripts/test-eps-shares.cjs [symbol]
 * Example: node scripts/test-eps-shares.cjs NFLX
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function main() {
  const symbol = process.argv[2] || 'NFLX';

  console.log('='.repeat(70));
  console.log(`EPS & Shares Outstanding Investigation: ${symbol}`);
  console.log('='.repeat(70));
  console.log();

  // Get income statements with EPS
  console.log('Fetching income statements...');
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
  console.log('Fetching balance sheets...');
  const balanceResult = await graphqlQuery(`
    query {
      balanceSheets(ticker: "${symbol}", isAnnual: true, limit: 10) {
        fiscalDateEnding
        commonStockSharesOutstanding
        totalEquity
      }
    }
  `);

  console.log('\n--- Income Statements (EPS Data) ---');
  console.log('Date'.padEnd(15) + 'Revenue'.padStart(12) + 'Net Income'.padStart(12) + 'EPS Reported'.padStart(15));
  console.log('-'.repeat(55));

  if (incomeResult.incomeStatements) {
    incomeResult.incomeStatements.forEach(is => {
      const date = is.fiscalDateEnding;
      const rev = is.totalRevenue ? `$${(is.totalRevenue / 1e9).toFixed(2)}B` : 'N/A';
      const ni = is.netIncome ? `$${(is.netIncome / 1e9).toFixed(2)}B` : 'N/A';
      const eps = is.epsReported !== null ? `$${is.epsReported.toFixed(2)}` : 'NULL';
      console.log(date.padEnd(15) + rev.padStart(12) + ni.padStart(12) + eps.padStart(15));
    });
  }

  console.log('\n--- Balance Sheets (Shares Outstanding) ---');
  console.log('Date'.padEnd(15) + 'Shares Outstanding'.padStart(22) + 'Total Equity'.padStart(15));
  console.log('-'.repeat(55));

  if (balanceResult.balanceSheets) {
    balanceResult.balanceSheets.forEach(bs => {
      const date = bs.fiscalDateEnding;
      const shares = bs.commonStockSharesOutstanding
        ? `${(bs.commonStockSharesOutstanding / 1e6).toFixed(2)}M`
        : '*** NULL ***';
      const equity = bs.totalEquity ? `$${(bs.totalEquity / 1e9).toFixed(2)}B` : 'N/A';
      console.log(date.padEnd(15) + shares.padStart(22) + equity.padStart(15));
    });
  }

  console.log('\n--- EPS Validation Analysis ---');
  console.log('Date'.padEnd(15) + 'Reported EPS'.padStart(14) + 'Calculated EPS'.padStart(16) + 'Difference'.padStart(12) + 'Issue'.padStart(20));
  console.log('-'.repeat(80));

  if (incomeResult.incomeStatements && balanceResult.balanceSheets) {
    let prevShares = null;

    // Sort by date descending (newest first)
    const sortedIncome = [...incomeResult.incomeStatements].sort((a, b) =>
      new Date(b.fiscalDateEnding) - new Date(a.fiscalDateEnding)
    );
    const sortedBalance = [...balanceResult.balanceSheets].sort((a, b) =>
      new Date(b.fiscalDateEnding) - new Date(a.fiscalDateEnding)
    );

    sortedIncome.forEach(is => {
      const matchingBS = sortedBalance.find(bs => bs.fiscalDateEnding === is.fiscalDateEnding);
      const shares = matchingBS?.commonStockSharesOutstanding;

      let issue = '';
      let calcEPS = 'N/A';
      let diff = 'N/A';

      if (!shares) {
        issue = '⚠️ MISSING SHARES';
      } else if (!is.netIncome) {
        issue = '⚠️ MISSING NET INCOME';
      } else {
        const calculated = is.netIncome / shares;
        calcEPS = `$${calculated.toFixed(2)}`;

        if (is.epsReported !== null) {
          const diffPercent = ((calculated - is.epsReported) / is.epsReported * 100);
          diff = `${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%`;

          if (Math.abs(diffPercent) > 50) {
            issue = '🚨 MAJOR DISCREPANCY';
          } else if (Math.abs(diffPercent) > 10) {
            issue = '⚠️ Check dilution';
          } else {
            issue = '✅ OK';
          }
        } else {
          issue = '⚠️ NULL EPS REPORTED';
        }
      }

      // Check for share count changes
      if (prevShares && shares) {
        const shareChange = ((shares - prevShares) / prevShares * 100);
        if (Math.abs(shareChange) > 50) {
          issue += ` | 📊 Shares ${shareChange > 0 ? '+' : ''}${shareChange.toFixed(0)}%`;
        }
      }
      prevShares = shares;

      const date = is.fiscalDateEnding;
      const epsReported = is.epsReported !== null ? `$${is.epsReported.toFixed(2)}` : 'NULL';

      console.log(date.padEnd(15) + epsReported.padStart(14) + calcEPS.padStart(16) + diff.padStart(12) + issue.padStart(20));
    });
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const nullShares = balanceResult.balanceSheets?.filter(bs => !bs.commonStockSharesOutstanding).length || 0;
  const nullEPS = incomeResult.incomeStatements?.filter(is => is.epsReported === null).length || 0;

  console.log(`Total Balance Sheets: ${balanceResult.balanceSheets?.length || 0}`);
  console.log(`Balance Sheets with NULL shares: ${nullShares}`);
  console.log(`Total Income Statements: ${incomeResult.incomeStatements?.length || 0}`);
  console.log(`Income Statements with NULL EPS: ${nullEPS}`);

  if (nullShares > 0) {
    console.log('\n🚨 ISSUE: Missing commonStockSharesOutstanding data');
    console.log('   The backend is not returning shares outstanding for some years.');
    console.log('   This prevents us from showing shares on the EPS chart.');
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

