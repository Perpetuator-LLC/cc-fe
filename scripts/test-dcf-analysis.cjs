#!/usr/bin/env node
/**
 * Test DCF Analysis GraphQL API
 *
 * Usage:
 *   node scripts/test-dcf-analysis.cjs [symbol]
 *
 * Examples:
 *   node scripts/test-dcf-analysis.cjs         # Test with MSFT (default)
 *   node scripts/test-dcf-analysis.cjs AAPL    # Test with AAPL
 *   node scripts/test-dcf-analysis.cjs GOOGL 7 # Test with 7 projection years
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { graphqlQuery, loadEnvironment, getTokenInfo } = require('./lib/test-utils.cjs');

// DCF Analysis Query
const DCF_ANALYSIS_QUERY = `
query DcfAnalysis($ticker: String!, $projectionYears: Int) {
  dcfAnalysis(ticker: $ticker, projectionYears: $projectionYears) {
    symbol
    analysisDate
    companyName

    historicalFcf {
      date
      value
      operatingCashFlow
    }
    historicalRevenue {
      date
      value
    }
    historicalNetIncome {
      date
      value
    }

    baseCase {
      intrinsicValuePerShare
      currentPrice
      upsidePercentage
      marginOfSafety
      enterpriseValue
      presentValueFcf
      terminalValue
      presentValueTerminal
      netDebt
      equityValue
      sharesOutstanding
      wacc
      costOfEquity
      costOfDebt
      debtWeight
      equityWeight
      terminalGrowthRate
      projectionYears
      projections {
        year
        date
        fcf
        discountedFcf
        growthRate
      }
    }

    bullCase {
      intrinsicValuePerShare
      currentPrice
      upsidePercentage
      marginOfSafety
      wacc
      terminalGrowthRate
      projections {
        year
        date
        fcf
        discountedFcf
        growthRate
      }
    }

    bearCase {
      intrinsicValuePerShare
      currentPrice
      upsidePercentage
      marginOfSafety
      wacc
      terminalGrowthRate
      projections {
        year
        date
        fcf
        discountedFcf
        growthRate
      }
    }

    intrinsicValueMin
    intrinsicValueMax
    intrinsicValueMean
    intrinsicValueMedian

    sensitivityGrid {
      discountRate
      terminalGrowth
      intrinsicValue
    }

    projectionChartData {
      date
      type
      fcf
      fcfBase
      fcfBull
      fcfBear
    }

    valuationSummary {
      currentPrice
      intrinsicValueBase
      intrinsicValueBull
      intrinsicValueBear
      upsideBase
      marginOfSafety
      wacc
      terminalGrowth
    }

    assumptions {
      projectionYears
      riskFreeRate
      marketRiskPremium
      beta
      taxRate
      terminalGrowthRate
    }
  }
}
`;

// Format currency
function formatCurrency(value) {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format percentage
function formatPercent(value) {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// Format billions
function formatBillions(value) {
  if (value === null || value === undefined) return 'N/A';
  return `$${(value / 1e9).toFixed(2)}B`;
}

async function testDcfAnalysis(symbol = 'MSFT', projectionYears = 5) {
  console.log('='.repeat(60));
  console.log('DCF Analysis API Test');
  console.log('='.repeat(60));

  const env = loadEnvironment();
  console.log(`\nAPI URL: ${env.API_BASE_URL}/graphql/`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Projection Years: ${projectionYears}`);

  const tokenInfo = getTokenInfo();
  if (tokenInfo) {
    console.log(`Token Status: ${tokenInfo.isExpired ? '❌ Expired' : '✅ Valid'}`);
  }

  console.log('\n--- Fetching DCF Analysis ---\n');

  try {
    const data = await graphqlQuery(DCF_ANALYSIS_QUERY, {
      ticker: symbol,
      projectionYears: projectionYears,
    });

    const dcf = data.dcfAnalysis;

    if (!dcf) {
      console.log('❌ No DCF data returned.');
      console.log('   This usually means:');
      console.log('   1. The company lacks sufficient fundamental data');
      console.log('   2. You need to run FUNDAMENTALS command first');
      console.log('   3. The company needs at least 3 years of cash flow data');
      return false;
    }

    console.log('✅ DCF Analysis Retrieved Successfully!\n');

    // Summary
    console.log('--- Valuation Summary ---');
    console.log(`Company: ${dcf.companyName} (${dcf.symbol})`);
    console.log(`Analysis Date: ${dcf.analysisDate}`);
    console.log(`Current Price: ${formatCurrency(dcf.valuationSummary.currentPrice)}`);
    console.log('');

    console.log('--- Intrinsic Value Scenarios ---');
    console.log(`Bear Case: ${formatCurrency(dcf.valuationSummary.intrinsicValueBear)}`);
    console.log(`Base Case: ${formatCurrency(dcf.valuationSummary.intrinsicValueBase)} (${formatPercent(dcf.valuationSummary.upsideBase)} upside)`);
    console.log(`Bull Case: ${formatCurrency(dcf.valuationSummary.intrinsicValueBull)}`);
    console.log('');

    console.log('--- Key Metrics ---');
    console.log(`WACC: ${dcf.valuationSummary.wacc.toFixed(2)}%`);
    console.log(`Terminal Growth: ${dcf.valuationSummary.terminalGrowth.toFixed(2)}%`);
    console.log(`Margin of Safety: ${dcf.valuationSummary.marginOfSafety.toFixed(2)}%`);
    console.log('');

    console.log('--- Assumptions ---');
    console.log(`Risk-Free Rate: ${dcf.assumptions.riskFreeRate.toFixed(2)}%`);
    console.log(`Market Risk Premium: ${dcf.assumptions.marketRiskPremium.toFixed(2)}%`);
    console.log(`Beta: ${dcf.assumptions.beta.toFixed(2)}`);
    console.log(`Tax Rate: ${dcf.assumptions.taxRate.toFixed(2)}%`);
    console.log('');

    console.log('--- Enterprise Value Breakdown (Base Case) ---');
    console.log(`PV of FCF: ${formatBillions(dcf.baseCase.presentValueFcf)}`);
    console.log(`PV of Terminal Value: ${formatBillions(dcf.baseCase.presentValueTerminal)}`);
    console.log(`Enterprise Value: ${formatBillions(dcf.baseCase.enterpriseValue)}`);
    console.log(`Net Debt: ${formatBillions(dcf.baseCase.netDebt)}`);
    console.log(`Equity Value: ${formatBillions(dcf.baseCase.equityValue)}`);
    console.log(`Shares Outstanding: ${(dcf.baseCase.sharesOutstanding / 1e9).toFixed(2)}B`);
    console.log('');

    console.log('--- FCF Projections (Base Case) ---');
    dcf.baseCase.projections.forEach((p) => {
      console.log(`  Year ${p.year}: FCF ${formatBillions(p.fcf)}, Discounted ${formatBillions(p.discountedFcf)}, Growth ${p.growthRate.toFixed(1)}%`);
    });
    console.log('');

    console.log('--- Historical Data ---');
    console.log(`Historical FCF: ${dcf.historicalFcf.length} data points`);
    console.log(`Historical Revenue: ${dcf.historicalRevenue.length} data points`);
    console.log(`Historical Net Income: ${dcf.historicalNetIncome.length} data points`);
    console.log('');

    console.log('--- Sensitivity Grid ---');
    console.log(`Grid Points: ${dcf.sensitivityGrid.length}`);
    if (dcf.sensitivityGrid.length > 0) {
      const minIV = Math.min(...dcf.sensitivityGrid.map((p) => p.intrinsicValue));
      const maxIV = Math.max(...dcf.sensitivityGrid.map((p) => p.intrinsicValue));
      console.log(`IV Range: ${formatCurrency(minIV)} - ${formatCurrency(maxIV)}`);
    }
    console.log('');

    console.log('--- Chart Data ---');
    console.log(`Projection Chart Points: ${dcf.projectionChartData.length}`);
    const historical = dcf.projectionChartData.filter((p) => p.type === 'historical');
    const projected = dcf.projectionChartData.filter((p) => p.type === 'projected');
    console.log(`  Historical: ${historical.length}`);
    console.log(`  Projected: ${projected.length}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ DCF Analysis Test Complete');
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
const years = parseInt(args[1], 10) || 5;

testDcfAnalysis(symbol, years).then((success) => {
  process.exit(success ? 0 : 1);
});

