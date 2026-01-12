#!/usr/bin/env node
/**
 * Test Fundamentals GraphQL API
 *
 * Usage:
 *   node scripts/test-fundamentals.cjs [symbol] [period]
 *
 * Examples:
 *   node scripts/test-fundamentals.cjs              # Test MSFT annual (default)
 *   node scripts/test-fundamentals.cjs AAPL         # Test AAPL annual
 *   node scripts/test-fundamentals.cjs GOOGL q      # Test GOOGL quarterly
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { graphqlQuery, loadEnvironment, getTokenInfo } = require('./lib/test-utils.cjs');

// Queries matching the actual schema
const BALANCE_SHEETS_QUERY = `
query BalanceSheets($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
  balanceSheets(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
    fiscalDateEnding
    totalAssets
    totalLiabilities
    totalEquity
    shortTermDebt
    longTermDebt
  }
}
`;

const INCOME_STATEMENTS_QUERY = `
query IncomeStatements($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
  incomeStatements(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
    fiscalDateEnding
    totalRevenue
    netIncome
  }
}
`;

const CASH_FLOWS_QUERY = `
query CashFlows($ticker: String!, $isAnnual: Boolean!, $limit: Int) {
  cashFlows(ticker: $ticker, isAnnual: $isAnnual, limit: $limit) {
    fiscalDateEnding
    operatingCashFlow
    dividendPayout
  }
}
`;

// Format billions
function formatBillions(value) {
  if (value === null || value === undefined) return 'N/A';
  const billions = value / 1e9;
  return `$${billions.toFixed(2)}B`;
}

// Format percentage
function formatPercent(numerator, denominator) {
  if (!numerator || !denominator) return 'N/A';
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

async function testFundamentals(symbol = 'MSFT', isAnnual = true, limit = 10) {
  console.log('='.repeat(60));
  console.log('Fundamentals API Test');
  console.log('='.repeat(60));

  const env = loadEnvironment();
  console.log(`\nAPI URL: ${env.API_BASE_URL}/graphql/`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Period: ${isAnnual ? 'Annual' : 'Quarterly'}`);
  console.log(`Limit: ${limit} periods`);

  const tokenInfo = getTokenInfo();
  if (tokenInfo) {
    console.log(`Token Status: ${tokenInfo.isExpired ? '❌ Expired' : '✅ Valid'}`);
  }

  console.log('\n--- Fetching Fundamentals ---\n');

  try {
    // Query all three endpoints in parallel
    const [bsData, isData, cfData] = await Promise.all([
      graphqlQuery(BALANCE_SHEETS_QUERY, { ticker: symbol, isAnnual, limit }).catch((e) => {
        console.log(`  Balance Sheet query failed: ${e.message}`);
        return {};
      }),
      graphqlQuery(INCOME_STATEMENTS_QUERY, { ticker: symbol, isAnnual, limit }).catch((e) => {
        console.log(`  Income Statement query failed: ${e.message}`);
        return {};
      }),
      graphqlQuery(CASH_FLOWS_QUERY, { ticker: symbol, isAnnual, limit }).catch((e) => {
        console.log(`  Cash Flow query failed: ${e.message}`);
        return {};
      }),
    ]);

    const balanceSheets = bsData.balanceSheets || [];
    const incomeStatements = isData.incomeStatements || [];
    const cashFlows = cfData.cashFlows || [];

    if (balanceSheets.length === 0 && incomeStatements.length === 0 && cashFlows.length === 0) {
      console.log('❌ No fundamentals data found.');
      console.log('   You may need to run the FUNDAMENTALS command in the UI first to fetch data.');
      return false;
    }

    console.log('✅ Fundamentals Retrieved Successfully!\n');

    // Summary counts
    console.log('--- Data Available ---');
    console.log(`Balance Sheets: ${balanceSheets.length} loaded`);
    console.log(`Income Statements: ${incomeStatements.length} loaded`);
    console.log(`Cash Flows: ${cashFlows.length} loaded`);
    console.log('');

    // Balance Sheet
    if (balanceSheets.length > 0) {
      console.log('--- Balance Sheet ---');
      balanceSheets.forEach((bs) => {
        console.log(`\n  ${bs.fiscalDateEnding}:`);
        console.log(`    Total Assets: ${formatBillions(bs.totalAssets)}`);
        console.log(`    Total Liabilities: ${formatBillions(bs.totalLiabilities)}`);
        console.log(`    Total Equity: ${formatBillions(bs.totalEquity)}`);
        console.log(`    Short-term Debt: ${formatBillions(bs.shortTermDebt)}`);
        console.log(`    Long-term Debt: ${formatBillions(bs.longTermDebt)}`);
      });
      console.log('');
    }

    // Income Statement
    if (incomeStatements.length > 0) {
      console.log('--- Income Statement ---');
      incomeStatements.forEach((is) => {
        console.log(`\n  ${is.fiscalDateEnding}:`);
        console.log(`    Revenue: ${formatBillions(is.totalRevenue)}`);
        console.log(`    Net Income: ${formatBillions(is.netIncome)} (${formatPercent(is.netIncome, is.totalRevenue)} margin)`);
      });
      console.log('');
    }

    // Cash Flow
    if (cashFlows.length > 0) {
      console.log('--- Cash Flow ---');
      cashFlows.forEach((cf) => {
        console.log(`\n  ${cf.fiscalDateEnding}:`);
        console.log(`    Operating Cash Flow: ${formatBillions(cf.operatingCashFlow)}`);
        console.log(`    Dividends: ${formatBillions(cf.dividendPayout)}`);
      });
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ Fundamentals Test Complete');
    console.log('='.repeat(60));

    return true;
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  }
}

// Main entry point
const args = process.argv.slice(2);
const symbol = args[0] || 'MSFT';
const isAnnual = args[1] !== 'q' && args[1] !== 'quarterly';
const limit = parseInt(args[2], 10) || 10;

testFundamentals(symbol, isAnnual, limit).then((success) => {
  process.exit(success ? 0 : 1);
});
