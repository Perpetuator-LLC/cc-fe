#!/usr/bin/env node
// Copyright (c) 2026 Perpetuator LLC
// Quick test for EPS in income statements

const { graphqlQuery } = require('./lib/test-utils.cjs');

const symbol = process.argv[2] || 'MSFT';

async function testEps() {
  console.log('=== Testing EPS for ' + symbol + ' ===\n');

  const query = 'query($ticker: String!) { incomeStatements(ticker: $ticker, isAnnual: true, limit: 10) { fiscalDateEnding epsReported totalRevenue netIncome } }';

  try {
    const result = await graphqlQuery(query, { ticker: symbol });
    const statements = result.incomeStatements || [];

    console.log('Income Statements: ' + statements.length + ' records\n');
    statements.forEach(function(s) {
      var eps = s.epsReported !== null ? '$' + s.epsReported.toFixed(2) : 'null';
      console.log('  ' + s.fiscalDateEnding + ': EPS=' + eps);
    });

    var withEps = statements.filter(function(s) { return s.epsReported !== null; }).length;
    console.log('\n' + withEps + '/' + statements.length + ' records have EPS data');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEps().then(function() {
  console.log('\n=== Done ===');
}).catch(function(err) {
  console.error('Fatal:', err);
  process.exit(1);
});

