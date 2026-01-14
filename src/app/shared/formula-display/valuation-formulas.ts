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
  },

  equityValue: {
    title: 'Equity Value',
    description: 'The portion of enterprise value available to shareholders after accounting for debt.',
    formulaHtml: `Equity Value = Enterprise Value − Net Debt`,
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
  },

  terminalValue: {
    title: 'Terminal Value (Gordon Growth)',
    description: 'The value of all cash flows beyond the projection period, assuming perpetual growth.',
    formulaHtml: `TV = <span class="fraction">
      <span class="fraction-top">FCF<span class="subscript">n</span> × (1 + g)</span>
      <span class="fraction-bottom">WACC − g</span>
    </span>`,
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
  },

  costOfEquity: {
    title: 'Cost of Equity (CAPM)',
    description:
      'The expected return required by equity investors, ' + 'calculated using the Capital Asset Pricing Model.',
    formulaHtml:
      'R<span class="subscript">e</span> = R<span class="subscript">f</span> + β × ' +
      '(R<span class="subscript">m</span> − R<span class="subscript">f</span>)',
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
