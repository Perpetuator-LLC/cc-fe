/**
 * Test TSM DCF data to verify currency handling
 */
const { graphqlQuery } = require('./lib/test-utils.cjs');

async function test() {
  console.log('=== Testing TSM DCF Currency Handling ===\n');

  const data = await graphqlQuery(`
    query {
      dcfAnalysis(ticker: "TSM") {
        symbol
        companyName
        tradingCurrency
        reportingCurrency
        isAdr
        currencyNote
        historicalFcf {
          date
          value
        }
        historicalRevenue {
          date
          value
        }
        baseCase {
          intrinsicValuePerShare
          currentPrice
        }
      }
    }
  `);

  if (!data.dcfAnalysis) {
    console.log('No DCF data for TSM - may need to fetch fundamentals first');
    return;
  }

  const dcf = data.dcfAnalysis;

  console.log('=== Currency Fields ===');
  console.log(`  Trading Currency: ${dcf.tradingCurrency}`);
  console.log(`  Reporting Currency: ${dcf.reportingCurrency}`);
  console.log(`  Is ADR: ${dcf.isAdr}`);
  console.log(`  Currency Note: ${dcf.currencyNote || '(none)'}`);

  console.log('\n=== Historical FCF (in reporting currency) ===');
  dcf.historicalFcf.slice(-5).forEach((item) => {
    const valueB = (item.value / 1e9).toFixed(2);
    console.log(`  ${item.date}: ${valueB}B ${dcf.reportingCurrency}`);
  });

  console.log('\n=== Historical Revenue (in reporting currency) ===');
  dcf.historicalRevenue.slice(-5).forEach((item) => {
    const valueB = (item.value / 1e9).toFixed(2);
    console.log(`  ${item.date}: ${valueB}B ${dcf.reportingCurrency}`);
  });

  console.log('\n=== Valuation ===');
  console.log(`  Current Price: $${dcf.baseCase.currentPrice.toFixed(2)} (${dcf.tradingCurrency})`);
  console.log(`  Intrinsic Value: $${dcf.baseCase.intrinsicValuePerShare.toFixed(2)} (${dcf.tradingCurrency})`);

  console.log('\n=== Analysis ===');
  if (dcf.tradingCurrency !== dcf.reportingCurrency) {
    console.log('  ⚠️  CURRENCY MISMATCH DETECTED');
    console.log(`  Stock trades in ${dcf.tradingCurrency} but financials are in ${dcf.reportingCurrency}`);
    console.log('  Revenue values shown above are in ' + dcf.reportingCurrency + ', NOT USD!');
    console.log('  For reference: TWD 1B ≈ USD ~31M (rough conversion)');
  } else {
    console.log('  ✓ Trading and reporting currencies match');
  }
}

test().catch(console.error);

