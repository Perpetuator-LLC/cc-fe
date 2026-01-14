/**
 * Test EPS and Earnings Data
 *
 * Usage: node scripts/test-eps-data.cjs [SYMBOL]
 */

const { graphqlQuery } = require('./lib/test-utils.cjs');

async function testEpsData(symbol = 'MSFT') {
  console.log(`\n=== Testing EPS Data for ${symbol} ===\n`);

  // Test earnings query
  const earningsQuery = `
    query {
      earnings(ticker: "${symbol}", limit: 10) {
        fiscalDateEnding
        reportedEps
        estimatedEps
        surpriseEps
        surprisePercentage
      }
    }
  `;

  console.log('1. Testing earnings query...');
  try {
    const earnings = await graphqlQuery(earningsQuery);
    console.log('Earnings response:', JSON.stringify(earnings, null, 2));

    if (earnings.data?.earnings?.length > 0) {
      console.log(`\n✅ Found ${earnings.data.earnings.length} earnings records`);
      console.log('Latest EPS:', earnings.data.earnings[0]?.reportedEps);
    } else {
      console.log('❌ No earnings data found');
    }
  } catch (err) {
    console.error('Earnings query error:', err.message);
  }

  // Test income statements for EPS
  const incomeQuery = `
    query {
      incomeStatements(ticker: "${symbol}", isAnnual: true, limit: 5) {
        fiscalDateEnding
        totalRevenue
        netIncome
        epsReported
      }
    }
  `;

  console.log('\n2. Testing income statements for EPS...');
  try {
    const income = await graphqlQuery(incomeQuery);
    console.log('Income statement response:', JSON.stringify(income, null, 2));

    if (income.data?.incomeStatements?.length > 0) {
      console.log(`\n✅ Found ${income.data.incomeStatements.length} income statements`);
      income.data.incomeStatements.forEach(stmt => {
        console.log(`  ${stmt.fiscalDateEnding}: EPS=${stmt.epsReported}`);
      });
    } else {
      console.log('❌ No income statement data found');
    }
  } catch (err) {
    console.error('Income query error:', err.message);
  }

  // Test DCF analysis with correct field names
  const dcfQuery = `
    query {
      dcfAnalysis(ticker: "${symbol}") {
        symbol
        intrinsicValueMean
        intrinsicValueMin
        intrinsicValueMax
        currentStockPrice
        waccBase
        terminalGrowthRateBase
        projectionChartData
      }
    }
  `;

  console.log('\n3. Testing DCF analysis...');
  try {
    const dcf = await graphqlQuery(dcfQuery);
    console.log('DCF response:', JSON.stringify(dcf, null, 2));

    if (dcf.data?.dcfAnalysis) {
      console.log('\n✅ DCF analysis found');
      console.log('  Intrinsic Value Mean:', dcf.data.dcfAnalysis.intrinsicValueMean);
      console.log('  Current Price:', dcf.data.dcfAnalysis.currentStockPrice);
    } else {
      console.log('❌ No DCF analysis found');
    }
  } catch (err) {
    console.error('DCF query error:', err.message);
  }
}

// Run tests
const symbol = process.argv[2] || 'MSFT';
testEpsData(symbol).then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
