// Copyright (c) 2026 Perpetuator LLC
import { FormulaVariable } from './formula-display.component';

/**
 * DCF Valuation Formulas
 *
 * HTML-formatted formulas for displaying in the methodology section.
 * Uses span classes for formatting: .fraction, .fraction-top, .fraction-bottom,
 * .sum, .subscript, .superscript
 */
export const DCF_FORMULAS = {
  intrinsicValue: {
    title: 'Intrinsic Value Per Share',
    description: 'The fair value of one share, calculated by dividing equity value by shares outstanding.',
    formulaHtml: `Intrinsic Value = <span class="fraction">
      <span class="fraction-top">Equity Value</span>
      <span class="fraction-bottom">Shares Outstanding</span>
    </span>`,
    variableDefinitions: [
      { symbol: 'Equity Value', definition: 'Enterprise Value minus Net Debt' },
      { symbol: 'Shares Outstanding', definition: 'Total shares of common stock' },
    ],
  },

  equityValue: {
    title: 'Equity Value',
    description: 'The portion of enterprise value available to shareholders after accounting for debt.',
    formulaHtml: `Equity Value = Enterprise Value − Net Debt`,
    variableDefinitions: [
      { symbol: 'Enterprise Value', definition: 'Total value of business operations' },
      { symbol: 'Net Debt', definition: 'Total debt minus cash and equivalents' },
    ],
  },

  enterpriseValue: {
    title: 'Enterprise Value',
    description: 'The total value of the business operations, including both debt and equity.',
    formulaHtml: `EV = <span class="sum">Σ</span>
      <span class="fraction">
        <span class="fraction-top">FCF<span class="subscript">t</span></span>
        <span class="fraction-bottom">(1 + WACC)<span class="superscript">t</span></span>
      </span>
      +
      <span class="fraction">
        <span class="fraction-top">Terminal Value</span>
        <span class="fraction-bottom">(1 + WACC)<span class="superscript">n</span></span>
      </span>`,
    variableDefinitions: [
      { symbol: 'EV', definition: 'Enterprise value' },
      { symbol: 'FCF<sub>t</sub>', definition: 'Free cash flow in year t' },
      { symbol: 'WACC', definition: 'Weighted average cost of capital' },
      { symbol: 't', definition: 'Year number (1, 2, 3, ...)' },
      { symbol: 'n', definition: 'Number of projection years' },
    ],
  },

  terminalValue: {
    title: 'Terminal Value (Gordon Growth)',
    description: 'The value of all cash flows beyond the projection period, assuming perpetual growth.',
    formulaHtml: `TV = <span class="fraction">
      <span class="fraction-top">FCF<span class="subscript">n</span> × (1 + g)</span>
      <span class="fraction-bottom">WACC − g</span>
    </span>`,
    variableDefinitions: [
      { symbol: 'TV', definition: 'Terminal value' },
      { symbol: 'FCF<sub>n</sub>', definition: 'Free cash flow in final projection year' },
      { symbol: 'g', definition: 'Perpetual growth rate (typically 2-3%)' },
      { symbol: 'WACC', definition: 'Weighted average cost of capital' },
    ],
  },

  wacc: {
    title: 'Weighted Average Cost of Capital',
    description: 'The blended cost of financing from both debt and equity sources.',
    formulaHtml: `WACC = <span class="fraction">
      <span class="fraction-top">E</span>
      <span class="fraction-bottom">E + D</span>
    </span> × R<span class="subscript">e</span>
    +
    <span class="fraction">
      <span class="fraction-top">D</span>
      <span class="fraction-bottom">E + D</span>
    </span> × R<span class="subscript">d</span> × (1 − T)`,
    variableDefinitions: [
      { symbol: 'E', definition: 'Market value of equity (market cap)' },
      { symbol: 'D', definition: 'Market value of debt' },
      { symbol: 'V', definition: 'Total capital (E + D)' },
      { symbol: 'R<sub>e</sub>', definition: 'Cost of equity (calculated using CAPM)' },
      { symbol: 'R<sub>d</sub>', definition: 'Cost of debt (interest rate on debt)' },
      { symbol: 'T', definition: 'Corporate tax rate' },
    ],
  },

  costOfEquity: {
    title: 'Cost of Equity (CAPM)',
    description:
      'The expected return required by equity investors, ' + 'calculated using the Capital Asset Pricing Model.',
    formulaHtml:
      'R<span class="subscript">e</span> = R<span class="subscript">f</span> + β × ' +
      '(R<span class="subscript">m</span> − R<span class="subscript">f</span>)',
    variableDefinitions: [
      { symbol: 'R<sub>e</sub>', definition: 'Cost of equity (required return)' },
      { symbol: 'R<sub>f</sub>', definition: 'Risk-free rate (e.g., 10-year Treasury yield)' },
      { symbol: 'β', definition: 'Beta (measure of stock volatility vs market)' },
      { symbol: 'R<sub>m</sub>', definition: 'Expected market return' },
      { symbol: 'R<sub>m</sub> − R<sub>f</sub>', definition: 'Market risk premium' },
    ],
  },
};

/**
 * DDM Valuation Formulas
 */
export const DDM_FORMULAS = {
  gordonGrowth: {
    title: 'Gordon Growth Model',
    description: 'Simple DDM assuming constant dividend growth in perpetuity.',
    formulaHtml: `P = <span class="fraction">
      <span class="fraction-top">D<span class="subscript">0</span> × (1 + g)</span>
      <span class="fraction-bottom">r − g</span>
    </span>`,
    variableDefinitions: [
      { symbol: 'P', definition: 'Intrinsic value (fair price)' },
      { symbol: 'D<sub>0</sub>', definition: 'Current annual dividend per share' },
      { symbol: 'g', definition: 'Expected perpetual dividend growth rate' },
      { symbol: 'r', definition: 'Required rate of return (cost of equity)' },
    ],
  },

  twoStage: {
    title: 'Two-Stage DDM',
    description: 'Values dividends with high initial growth transitioning to stable growth.',
    formulaHtml: `P = <span class="sum">Σ</span>
      <span class="fraction">
        <span class="fraction-top">D<span class="subscript">t</span></span>
        <span class="fraction-bottom">(1 + r)<span class="superscript">t</span></span>
      </span>
      +
      <span class="fraction">
        <span class="fraction-top">P<span class="subscript">n</span></span>
        <span class="fraction-bottom">(1 + r)<span class="superscript">n</span></span>
      </span>`,
    variableDefinitions: [
      { symbol: 'P', definition: 'Intrinsic value (fair price)' },
      { symbol: 'D<sub>t</sub>', definition: 'Dividend in year t' },
      { symbol: 'r', definition: 'Required rate of return (cost of equity)' },
      { symbol: 'P<sub>n</sub>', definition: 'Terminal value at end of high-growth period' },
      { symbol: 'n', definition: 'Number of high-growth years' },
    ],
  },

  hModel: {
    title: 'H-Model',
    description: 'Values declining growth that gradually converges to stable long-term rate.',
    formulaHtml: `P = <span class="fraction">
      <span class="fraction-top">D<span class="subscript">0</span> × (1 + g<span class="subscript">L</span>)</span>
      <span class="fraction-bottom">r − g<span class="subscript">L</span></span>
    </span>
    +
    <span class="fraction">
      <span class="fraction-top">
        D<span class="subscript">0</span> × H × (g<span class="subscript">S</span> − g<span class="subscript">L</span>)
      </span>
      <span class="fraction-bottom">r − g<span class="subscript">L</span></span>
    </span>`,
    variableDefinitions: [
      { symbol: 'P', definition: 'Intrinsic value (fair price)' },
      { symbol: 'D<sub>0</sub>', definition: 'Current annual dividend per share' },
      { symbol: 'g<sub>L</sub>', definition: 'Long-term stable growth rate' },
      { symbol: 'g<sub>S</sub>', definition: 'Short-term high growth rate' },
      { symbol: 'H', definition: 'Half-life of high-growth period (years)' },
      { symbol: 'r', definition: 'Required rate of return (cost of equity)' },
    ],
  },

  intrinsicValue: {
    title: 'Intrinsic Value',
    description: 'The fair value per share based on the present value of all expected future dividends.',
    formulaHtml: `Intrinsic Value = PV(Dividends) + PV(Terminal Value)`,
    variableDefinitions: [
      { symbol: 'PV(Dividends)', definition: 'Present value of projected dividends during growth period' },
      { symbol: 'PV(Terminal Value)', definition: 'Present value of dividends beyond projection period' },
    ],
  },
};

/**
 * Build variables for DCF formula display
 */
export function buildDcfVariables(data: {
  wacc: number;
  terminalGrowth: number;
  riskFreeRate: number;
  beta: number;
  marketRiskPremium: number;
  taxRate: number;
}): FormulaVariable[] {
  return [
    {
      symbol: 'WACC',
      name: 'Weighted Average Cost of Capital',
      value: data.wacc,
      format: 'percent',
      editable: false,
    },
    {
      symbol: 'g',
      name: 'Terminal Growth Rate',
      value: data.terminalGrowth,
      format: 'percent',
      editable: true,
      step: 0.1,
      min: 0,
      max: 5,
    },
    {
      symbol: 'Rf',
      name: 'Risk-Free Rate',
      value: data.riskFreeRate,
      format: 'percent',
      editable: true,
      step: 0.1,
      min: 0,
      max: 10,
    },
    {
      symbol: 'β',
      name: 'Beta',
      value: data.beta,
      format: 'number',
      editable: true,
      step: 0.05,
      min: 0,
      max: 3,
    },
    {
      symbol: 'Rm − Rf',
      name: 'Market Risk Premium',
      value: data.marketRiskPremium,
      format: 'percent',
      editable: true,
      step: 0.1,
      min: 0,
      max: 15,
    },
    {
      symbol: 'T',
      name: 'Tax Rate',
      value: data.taxRate,
      format: 'percent',
      editable: false,
    },
  ];
}

/**
 * Build variables for DDM formula display
 */
export function buildDdmVariables(data: {
  currentDividend: number;
  growthRate: number;
  costOfEquity: number;
  terminalGrowth: number;
}): FormulaVariable[] {
  return [
    {
      symbol: 'D₀',
      name: 'Current Annual Dividend',
      value: data.currentDividend,
      format: 'currency',
      editable: false,
    },
    {
      symbol: 'g',
      name: 'Dividend Growth Rate',
      value: data.growthRate,
      format: 'percent',
      editable: true,
      step: 0.5,
      min: 0,
      max: 25,
    },
    {
      symbol: 'r',
      name: 'Cost of Equity',
      value: data.costOfEquity,
      format: 'percent',
      editable: true,
      step: 0.1,
      min: 0,
      max: 20,
    },
    {
      symbol: 'gL',
      name: 'Terminal Growth Rate',
      value: data.terminalGrowth,
      format: 'percent',
      editable: true,
      step: 0.1,
      min: 0,
      max: 5,
    },
  ];
}
