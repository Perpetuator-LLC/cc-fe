// Test script for DCF Analysis GraphQL API
// Run with: node scripts/test-dcf-analysis.cjs

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load environment for credentials
let TEST_EMAIL, TEST_PASSWORD, API_BASE_URL;
try {
  const envPath = path.join(__dirname, '../src/environments/environment.ts');
  const envContent = fs.readFileSync(envPath, 'utf8');

  const emailMatch = envContent.match(/TEST_EMAIL:\s*['"]([^'"]+)['"]/);
  const passwordMatch = envContent.match(/TEST_PASSWORD:\s*['"]([^'"]+)['"]/);
  const apiMatch = envContent.match(/API_BASE_URL:\s*['"]([^'"]+)['"]/);

  TEST_EMAIL = emailMatch?.[1] || 'test@example.com';
  TEST_PASSWORD = passwordMatch?.[1] || 'password';
  API_BASE_URL = apiMatch?.[1] || 'http://localhost:8000';
} catch (e) {
  console.log('Using default test credentials');
  TEST_EMAIL = 'test@example.com';
  TEST_PASSWORD = 'password';
  API_BASE_URL = 'http://localhost:8000';
}

const GRAPHQL_URL = `${API_BASE_URL}/graphql/`;

// DCF Analysis Query - as expected by frontend
const DCF_ANALYSIS_QUERY = `
query DcfAnalysis($ticker: String!, $projectionYears: Int) {
  dcfAnalysis(ticker: $ticker, projectionYears: $projectionYears) {
    symbol
    analysisDate
    companyName

    historicalFcf { date value operatingCashFlow }
    historicalRevenue { date value }
    historicalNetIncome { date value }

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
      projections { year date fcf discountedFcf growthRate }
    }

    bullCase {
      intrinsicValuePerShare
      currentPrice
      upsidePercentage
      marginOfSafety
      wacc
      terminalGrowthRate
      projections { year date fcf discountedFcf growthRate }
    }

    bearCase {
      intrinsicValuePerShare
      currentPrice
      upsidePercentage
      marginOfSafety
      wacc
      terminalGrowthRate
      projections { year date fcf discountedFcf growthRate }
    }

    intrinsicValueMin
    intrinsicValueMax
    intrinsicValueMean
    intrinsicValueMedian

    sensitivityGrid { discountRate terminalGrowth intrinsicValue }
    projectionChartData { date type fcf fcfBase fcfBull fcfBear }

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

// Simple introspection to check if dcfAnalysis exists
const INTROSPECTION_QUERY = `
query {
  __schema {
    queryType {
      fields {
        name
        description
      }
    }
  }
}
`;

function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const lib = isHttps ? https : http;

    const req = lib.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testDcfAnalysis() {
  console.log('=== DCF Analysis API Test ===\n');
  console.log(`API URL: ${GRAPHQL_URL}`);
  console.log(`Testing with symbol: MSFT\n`);

  // First, check if dcfAnalysis query exists via introspection
  console.log('1. Checking schema for dcfAnalysis query...');
  try {
    const introspectionResult = await makeRequest(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({ query: INTROSPECTION_QUERY }));

    if (introspectionResult.status === 200 && introspectionResult.data?.data?.__schema) {
      const fields = introspectionResult.data.data.__schema.queryType.fields;
      const dcfField = fields.find(f => f.name === 'dcfAnalysis');

      if (dcfField) {
        console.log('   ✅ dcfAnalysis query exists in schema');
        console.log(`   Description: ${dcfField.description || 'None'}`);
      } else {
        console.log('   ❌ dcfAnalysis query NOT FOUND in schema');
        console.log('\n   Available queries containing "dcf" or "valuation":');
        const related = fields.filter(f =>
          f.name.toLowerCase().includes('dcf') ||
          f.name.toLowerCase().includes('valuation') ||
          f.name.toLowerCase().includes('intrinsic')
        );
        if (related.length > 0) {
          related.forEach(f => console.log(`     - ${f.name}`));
        } else {
          console.log('     None found');
        }
      }
    }
  } catch (e) {
    console.log(`   ⚠️ Introspection failed: ${e.message}`);
  }

  // Try the actual DCF query
  console.log('\n2. Testing dcfAnalysis query...');
  try {
    const result = await makeRequest(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, JSON.stringify({
      query: DCF_ANALYSIS_QUERY,
      variables: { ticker: 'MSFT', projectionYears: 5 }
    }));

    console.log(`   Status: ${result.status}`);

    if (result.status === 200) {
      if (result.data?.errors) {
        console.log('   ❌ GraphQL Errors:');
        result.data.errors.forEach(err => {
          console.log(`      - ${err.message}`);
        });
      } else if (result.data?.data?.dcfAnalysis) {
        console.log('   ✅ DCF Analysis returned successfully!');
        const dcf = result.data.data.dcfAnalysis;
        console.log(`   Symbol: ${dcf.symbol}`);
        console.log(`   Company: ${dcf.companyName}`);
        console.log(`   Current Price: $${dcf.valuationSummary?.currentPrice}`);
        console.log(`   Base Case IV: $${dcf.valuationSummary?.intrinsicValueBase}`);
      } else {
        console.log('   ❌ No data returned');
        console.log(`   Response: ${JSON.stringify(result.data).substring(0, 500)}`);
      }
    } else {
      console.log('   ❌ Request failed');
      if (result.data?.errors) {
        result.data.errors.forEach(err => {
          console.log(`      - ${err.message}`);
        });
      }
    }
  } catch (e) {
    console.log(`   ❌ Request error: ${e.message}`);
  }

  console.log('\n=== Test Complete ===');
}

testDcfAnalysis().catch(console.error);

