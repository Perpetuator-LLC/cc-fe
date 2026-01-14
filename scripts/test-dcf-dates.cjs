// Copyright (c) 2026 Perpetuator LLC
// Test script to investigate DCF projection dates
// Usage: node scripts/test-dcf-dates.cjs [TICKER]

const { graphqlQuery } = require('./lib/test-utils.cjs');

const ticker = process.argv[2] || 'V';

async function testDcfDates() {
  console.log('\n=== Testing DCF Projection Dates for ' + ticker + ' ===\n');

  const query = `
    query DcfAnalysis($ticker: String!) {
      dcfAnalysis(ticker: $ticker, projectionYears: 5) {
        symbol
        analysisDate
        baseCase {
          projections {
            date
            fcf
            discountedFcf
            growthRate
          }
        }
        historicalFcf {
          date
          value
        }
        projectionChartData {
          date
          type
          fcf
          fcfBase
        }
      }
    }
  `;

  try {
    console.log('Fetching DCF analysis...');
    const result = await graphqlQuery(query, { ticker: ticker });

    if (!result || !result.dcfAnalysis) {
      console.log('No DCF analysis data returned');
      console.log('Result:', JSON.stringify(result, null, 2));
      return;
    }

    const dcf = result.dcfAnalysis;
    console.log('Analysis Date:', dcf.analysisDate);
    console.log('');

    // Historical FCF
    console.log('=== Historical FCF ===');
    if (dcf.historicalFcf && dcf.historicalFcf.length > 0) {
      console.log('Total records: ' + dcf.historicalFcf.length);
      console.log('First 3:');
      dcf.historicalFcf.slice(0, 3).forEach(function(h) {
        console.log('  ' + h.date + ': $' + (h.value / 1e9).toFixed(2) + 'B');
      });
      console.log('Last 3:');
      dcf.historicalFcf.slice(-3).forEach(function(h) {
        console.log('  ' + h.date + ': $' + (h.value / 1e9).toFixed(2) + 'B');
      });
    } else {
      console.log('No historical FCF data');
    }
    console.log('');

    // Base case projections
    console.log('=== Base Case Projections ===');
    if (dcf.baseCase && dcf.baseCase.projections) {
      dcf.baseCase.projections.forEach(function(p, i) {
        var fcfB = p.fcf ? (p.fcf / 1e9).toFixed(2) : 'N/A';
        var discB = p.discountedFcf ? (p.discountedFcf / 1e9).toFixed(2) : 'N/A';
        var growth = p.growthRate ? (p.growthRate * 100).toFixed(1) : 'N/A';
        console.log('  Year ' + (i + 1) + ': ' + p.date + ' - FCF: $' + fcfB + 'B, Discounted: $' + discB + 'B, Growth: ' + growth + '%');
      });
    } else {
      console.log('No base case projections');
    }
    console.log('');

    // Projection chart data
    console.log('=== Projection Chart Data ===');
    if (dcf.projectionChartData && dcf.projectionChartData.length > 0) {
      console.log('Total records: ' + dcf.projectionChartData.length);
      console.log('');
      console.log('All data points:');
      dcf.projectionChartData.forEach(function(p) {
        var fcfVal = p.fcf || p.fcfBase;
        var typeLabel = p.type === 'projected' ? '[PROJECTED]' : '[HISTORICAL]';
        console.log('  ' + p.date + ' ' + typeLabel + ': $' + (fcfVal ? (fcfVal / 1e9).toFixed(2) : 'N/A') + 'B');
      });

      // Check for date jumps
      console.log('');
      console.log('=== Date Jump Analysis ===');
      var prevDate = null;
      dcf.projectionChartData.forEach(function(p) {
        if (prevDate) {
          var prev = new Date(prevDate);
          var curr = new Date(p.date);
          var diffMonths = (curr.getFullYear() - prev.getFullYear()) * 12 + (curr.getMonth() - prev.getMonth());
          if (diffMonths > 15) {
            console.log('  WARNING LARGE GAP: ' + prevDate + ' -> ' + p.date + ' (' + diffMonths + ' months)');
          }
        }
        prevDate = p.date;
      });
    } else {
      console.log('No projection chart data');
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testDcfDates().then(function() {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});

