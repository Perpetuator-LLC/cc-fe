// Copyright (c) 2026 Perpetuator LLC

/**
 * Chart and Metric Definitions
 *
 * Educational tooltips explaining financial terminology and chart interpretation.
 * These are displayed when users hover over the info icons on charts.
 */

export const CHART_DEFINITIONS = {
  // Valuation Metrics
  dcf: {
    title: 'Discounted Cash Flow (DCF)',
    description:
      'A valuation method that estimates the value of an investment based on its expected ' +
      'future cash flows, discounted back to their present value using a discount rate (WACC).',
  },
  ddm: {
    title: 'Dividend Discount Model (DDM)',
    description:
      'A valuation model that determines the fair value of a stock based on the present ' +
      'value of expected future dividend payments.',
  },
  intrinsicValue: {
    title: 'Intrinsic Value',
    description:
      'The calculated "true" value of a stock based on fundamental analysis, ' +
      'independent of its current market price.',
  },
  wacc: {
    title: 'Weighted Average Cost of Capital (WACC)',
    description:
      'The average rate a company pays to finance its assets, weighted by the proportion ' +
      'of debt and equity. Used as the discount rate in DCF analysis.',
  },
  marginOfSafety: {
    title: 'Margin of Safety',
    description:
      'The difference between intrinsic value and current price. ' +
      'A positive margin means the stock may be undervalued.',
  },
  terminalValue: {
    title: 'Terminal Value',
    description:
      'The estimated value of a company beyond the projection period, ' +
      'assuming perpetual growth at a sustainable rate.',
  },

  // Dividend Metrics
  dividendYield: {
    title: 'Dividend Yield',
    description:
      'Annual dividend per share divided by the stock price. ' +
      'Shows the return from dividends as a percentage of your investment.',
  },
  payoutRatio: {
    title: 'Payout Ratio',
    description:
      'The percentage of net income paid out as dividends. ' + 'Lower ratios suggest more room for dividend growth.',
  },
  fcfPayoutRatio: {
    title: 'FCF Payout Ratio',
    description:
      'Dividends paid as a percentage of Free Cash Flow. A more reliable indicator of ' +
      'dividend sustainability than net income payout ratio.',
  },
  dividendCagr: {
    title: 'Dividend CAGR',
    description:
      'Compound Annual Growth Rate of dividends over a period. ' +
      'Shows the average annual rate of dividend increases.',
  },

  // Fundamental Metrics
  freeCashFlow: {
    title: 'Free Cash Flow (FCF)',
    description:
      'Operating Cash Flow minus Capital Expenditures. ' +
      'The cash available for dividends, debt repayment, or reinvestment.',
  },
  operatingCashFlow: {
    title: 'Operating Cash Flow',
    description:
      'Cash generated from core business operations. ' +
      'A key measure of business health, harder to manipulate than net income.',
  },
  grossProfit: {
    title: 'Gross Profit',
    description: 'Revenue minus Cost of Goods Sold. Shows profitability before operating expenses.',
  },
  netIncome: {
    title: 'Net Income',
    description: 'The bottom line profit after all expenses, taxes, and interest. Also called earnings.',
  },
  eps: {
    title: 'Earnings Per Share (EPS)',
    description:
      'Net income divided by shares outstanding. ' + 'Primary metric for comparing profitability across companies.',
  },

  // Valuation Ratios
  peRatio: {
    title: 'Price-to-Earnings (P/E) Ratio',
    description:
      'Stock price divided by EPS. Shows how much investors pay for each dollar of earnings. ' +
      'Lower may indicate undervaluation.',
  },
  pbRatio: {
    title: 'Price-to-Book (P/B) Ratio',
    description:
      'Stock price divided by book value per share. ' + 'Compares market value to accounting value of equity.',
  },
  psRatio: {
    title: 'Price-to-Sales (P/S) Ratio',
    description: 'Market cap divided by revenue. Useful for valuing companies with no earnings.',
  },

  // Charts
  fcfProjectionChart: {
    title: 'FCF Projections Chart',
    description:
      'Shows historical Free Cash Flow and projected values for Base, Bull, and Bear scenarios. ' +
      'Projections are based on growth rate assumptions.',
  },
  sensitivityChart: {
    title: 'Sensitivity Analysis',
    description:
      'Heatmap showing how intrinsic value changes with different discount rates (WACC) ' +
      'and terminal growth rates. Helps understand valuation range.',
  },
  historicalValuationChart: {
    title: 'Historical Valuation Multiples',
    description:
      'Tracks P/E, P/B, and P/S ratios over time. ' +
      'Helps identify if current valuation is above or below historical averages.',
  },

  // Fundamentals Charts
  revenueChart: {
    title: 'Revenue & Gross Profit',
    description:
      'Shows total revenue (sales) and gross profit over time. ' +
      'Gross profit = Revenue - Cost of Revenue. Indicates business growth and pricing power.',
  },
  incomeStatementChart: {
    title: 'Income Statement',
    description:
      'Shows net income (bottom line profit) over time. ' +
      'Net income is what remains after all expenses, taxes, and interest are deducted.',
  },
  epsChart: {
    title: 'Earnings Per Share (EPS)',
    description:
      'Net income divided by shares outstanding. The primary metric investors use to ' +
      'compare profitability across different-sized companies.',
  },
  balanceSheetChart: {
    title: 'Balance Sheet',
    description:
      'Shows total assets, liabilities, and equity. Assets = Liabilities + Equity. ' +
      'Indicates financial strength and leverage.',
  },
  cashFlowChart: {
    title: 'Cash Flow Statement',
    description:
      'Shows operating, investing, and financing cash flows. ' +
      'Operating cash flow is the key indicator of business health.',
  },
  marginsChart: {
    title: 'Profit Margins',
    description:
      'Gross margin and net margin as percentages. ' +
      'Higher margins indicate better pricing power and operational efficiency.',
  },

  // Dividend Charts
  payoutRatioChart: {
    title: 'Payout Ratio History',
    description:
      'FCF and dividend payout ratios over time. ' + 'Lower ratios mean more room for dividend growth or reinvestment.',
  },
  yearlyDividendsChart: {
    title: 'Yearly Dividends',
    description:
      'Historical dividend payments per share. ' + 'Look for consistent growth with no cuts for dividend reliability.',
  },
  cashFlowComparisonChart: {
    title: 'Cash Flow vs Dividends',
    description:
      'Compares Free Cash Flow to dividend payments. ' + 'FCF should comfortably exceed dividends for sustainability.',
  },
};

/**
 * Get tooltip text for a specific metric
 */
export function getChartDefinition(key: keyof typeof CHART_DEFINITIONS): string {
  const def = CHART_DEFINITIONS[key];
  return `${def.title}: ${def.description}`;
}

/**
 * Get just the description for a metric
 */
export function getDefinitionDescription(key: keyof typeof CHART_DEFINITIONS): string {
  return CHART_DEFINITIONS[key].description;
}
