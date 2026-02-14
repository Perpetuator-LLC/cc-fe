#!/usr/bin/env node
/**
 * Quick TSM currency verification test
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

const query = `
query DcfAnalysis {
  dcfAnalysis(ticker: "TSM", projectionYears: 5) {
    symbol
    tradingCurrency
    reportingCurrency
    exchangeRate
    baseCase {
      intrinsicValuePerShare
      currentPrice
    }
    valuationSummary {
      intrinsicValueBase
      intrinsicValueBull
      intrinsicValueBear
      currentPrice
      upsideBase
    }
  }
}
`;

(async () => {
  try {
    const data = await graphqlQuery(query);
    const dcf = data.dcfAnalysis;

    console.log('=== TSM DCF Currency Verification ===');
    console.log('tradingCurrency:', dcf.tradingCurrency);
    console.log('reportingCurrency:', dcf.reportingCurrency);
    console.log('exchangeRate:', dcf.exchangeRate);
    console.log('');
    console.log('baseCase.intrinsicValuePerShare:', dcf.baseCase.intrinsicValuePerShare);
    console.log('baseCase.currentPrice:', dcf.baseCase.currentPrice);
    console.log('');
    console.log('valuationSummary.intrinsicValueBase:', dcf.valuationSummary.intrinsicValueBase);
    console.log('valuationSummary.currentPrice:', dcf.valuationSummary.currentPrice);
    console.log('valuationSummary.upsideBase:', dcf.valuationSummary.upsideBase);
    console.log('');
    console.log('Values match?', dcf.baseCase.intrinsicValuePerShare === dcf.valuationSummary.intrinsicValueBase ? 'YES ✅' : 'NO ❌');

  } catch (error) {
    console.error('Error:', error.message);
  }
})();
