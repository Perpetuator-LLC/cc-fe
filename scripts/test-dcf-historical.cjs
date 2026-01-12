#!/usr/bin/env node
/**
 * Test DCF Historical Valuation API
 *
 * Usage:
 *   node scripts/test-dcf-historical.cjs [symbol]
 *
 * Copyright (c) 2025-2026 Perpetuator LLC
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

const query = `
query DcfAnalysis($ticker: String!, $projectionYears: Int) {
  dcfAnalysis(ticker: $ticker, projectionYears: $projectionYears) {
    symbol
    companyName
    historicalValuation {
      date
      price
      eps
      peRatio
      pbRatio
      psRatio
      bookValuePerShare
      avgPeRatio
      minPeRatio
      maxPeRatio
      avgPbRatio
    }
    projectionChartData {
      date
      type
      fcf
      fcfBase
      fcfBull
      fcfBear
    }
    historicalFcf {
      date
      value
    }
    historicalRevenue {
      date
      value
    }
    historicalNetIncome {
      date
      value
    }
  }
}
`;

(async () => {
  const symbol = process.argv[2] || 'MSFT';
  console.log('=== DCF Historical Valuation Data ===');
  console.log(`Testing symbol: ${symbol}\n`);

  try {
    const data = await graphqlQuery(query, { ticker: symbol, projectionYears: 5 });

    if (!data.dcfAnalysis) {
      console.log('No DCF analysis data returned');
      process.exit(1);
    }

    const dcf = data.dcfAnalysis;
    console.log('Symbol:', dcf.symbol);
    console.log('Company:', dcf.companyName);

    console.log('\n--- Historical Valuation ---');
    const hv = dcf.historicalValuation || [];
    console.log('Data points:', hv.length);
    if (hv.length > 0) {
      console.log('Date range:', hv[0]?.date, 'to', hv[hv.length-1]?.date);
      console.log('Avg P/E:', hv[0]?.avgPeRatio?.toFixed(2));
      console.log('P/E Range:', hv[0]?.minPeRatio?.toFixed(2), '-', hv[0]?.maxPeRatio?.toFixed(2));
      console.log('\nAll data points:');
      hv.forEach(h => {
        console.log(`  ${h.date}: Price=$${h.price?.toFixed(2)}, EPS=$${h.eps?.toFixed(2)}, P/E=${h.peRatio?.toFixed(2)}, P/B=${h.pbRatio?.toFixed(2)}, P/S=${h.psRatio?.toFixed(2)}`);
      });
    } else {
      console.log('No historical valuation data');
    }

    console.log('\n--- Projection Chart Data ---');
    const pcd = dcf.projectionChartData || [];
    console.log('Data points:', pcd.length);
    if (pcd.length > 0) {
      const historical = pcd.filter(p => p.type === 'historical');
      const projected = pcd.filter(p => p.type === 'projected');
      console.log('Historical:', historical.length, 'Projected:', projected.length);
      console.log('\nAll data points:');
      pcd.forEach(p => {
        const fcf = p.fcf || p.fcfBase || 0;
        console.log(`  ${p.date}: type=${p.type}, FCF=$${(fcf/1e9).toFixed(2)}B`);
      });
    }

    console.log('\n--- Historical FCF ---');
    const hfcf = dcf.historicalFcf || [];
    console.log('Data points:', hfcf.length);
    if (hfcf.length > 0) {
      console.log('Date range:', hfcf[0]?.date, 'to', hfcf[hfcf.length-1]?.date);
      hfcf.forEach(h => {
        console.log(`  ${h.date}: $${(h.value/1e9).toFixed(2)}B`);
      });
    }

    console.log('\n--- Historical Revenue ---');
    const hr = dcf.historicalRevenue || [];
    console.log('Data points:', hr.length);
    if (hr.length > 0) {
      console.log('Date range:', hr[0]?.date, 'to', hr[hr.length-1]?.date);
    }

    console.log('\n--- Historical Net Income ---');
    const hni = dcf.historicalNetIncome || [];
    console.log('Data points:', hni.length);
    if (hni.length > 0) {
      console.log('Date range:', hni[0]?.date, 'to', hni[hni.length-1]?.date);
    }

    console.log('\n=== Test Complete ===');

  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();

