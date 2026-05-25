// Copyright (c) 2026 Perpetuator LLC
import { buildDcfVariables, buildDdmVariables, DCF_FORMULAS, DDM_FORMULAS } from './valuation-formulas';

describe('valuation-formulas', () => {
  describe('DCF_FORMULAS', () => {
    it('exposes every expected formula entry', () => {
      expect(DCF_FORMULAS.intrinsicValue.title).toContain('Intrinsic Value');
      expect(DCF_FORMULAS.equityValue.title).toContain('Equity Value');
      expect(DCF_FORMULAS.enterpriseValue.title).toContain('Enterprise Value');
      expect(DCF_FORMULAS.terminalValue.title).toContain('Terminal Value');
      expect(DCF_FORMULAS.wacc.title).toContain('Weighted Average');
      expect(DCF_FORMULAS.costOfEquity.title).toContain('Cost of Equity');
    });

    it('every entry has formula HTML and variable definitions', () => {
      for (const key of Object.keys(DCF_FORMULAS) as (keyof typeof DCF_FORMULAS)[]) {
        const entry = DCF_FORMULAS[key];
        expect(entry.formulaHtml).toBeTruthy();
        expect(Array.isArray(entry.variableDefinitions)).toBeTrue();
        expect(entry.variableDefinitions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('DDM_FORMULAS', () => {
    it('exposes every expected formula entry', () => {
      expect(DDM_FORMULAS.gordonGrowth.title).toContain('Gordon');
      expect(DDM_FORMULAS.twoStage.title).toContain('Two-Stage');
      expect(DDM_FORMULAS.hModel.title).toContain('H-Model');
      expect(DDM_FORMULAS.intrinsicValue.title).toContain('Intrinsic Value');
    });

    it('every entry has formula HTML and variable definitions', () => {
      for (const key of Object.keys(DDM_FORMULAS) as (keyof typeof DDM_FORMULAS)[]) {
        const entry = DDM_FORMULAS[key];
        expect(entry.formulaHtml).toBeTruthy();
        expect(Array.isArray(entry.variableDefinitions)).toBeTrue();
      }
    });
  });

  describe('buildDcfVariables', () => {
    it('returns 6 variables in the canonical order', () => {
      const vars = buildDcfVariables({
        wacc: 9.5,
        terminalGrowth: 2.5,
        riskFreeRate: 4,
        beta: 1.2,
        marketRiskPremium: 5,
        taxRate: 21,
      });
      expect(vars.length).toBe(6);
      expect(vars.map((v) => v.symbol)).toEqual(['WACC', 'g', 'Rf', 'β', 'Rm − Rf', 'T']);
    });

    it('marks the assumption inputs editable and the WACC/T derived ones not editable', () => {
      const vars = buildDcfVariables({
        wacc: 9.5,
        terminalGrowth: 2.5,
        riskFreeRate: 4,
        beta: 1.2,
        marketRiskPremium: 5,
        taxRate: 21,
      });
      const editable = vars.filter((v) => v.editable).map((v) => v.symbol);
      expect(editable.sort()).toEqual(['g', 'Rf', 'β', 'Rm − Rf'].sort());
      const fixed = vars.filter((v) => !v.editable).map((v) => v.symbol);
      expect(fixed.sort()).toEqual(['T', 'WACC'].sort());
    });

    it('uses the supplied numeric values verbatim', () => {
      const vars = buildDcfVariables({
        wacc: 8.1,
        terminalGrowth: 1.5,
        riskFreeRate: 3.5,
        beta: 0.9,
        marketRiskPremium: 6,
        taxRate: 25,
      });
      const map = new Map(vars.map((v) => [v.symbol, v.value]));
      expect(map.get('WACC')).toBe(8.1);
      expect(map.get('g')).toBe(1.5);
      expect(map.get('Rf')).toBe(3.5);
      expect(map.get('β')).toBe(0.9);
      expect(map.get('Rm − Rf')).toBe(6);
      expect(map.get('T')).toBe(25);
    });
  });

  describe('buildDdmVariables', () => {
    it('returns 4 variables in the canonical order', () => {
      const vars = buildDdmVariables({
        currentDividend: 3,
        growthRate: 5,
        costOfEquity: 8,
        terminalGrowth: 2,
      });
      expect(vars.length).toBe(4);
      expect(vars.map((v) => v.symbol)).toEqual(['D₀', 'g', 'r', 'gL']);
    });

    it('marks D₀ as non-editable and growth/return as editable', () => {
      const vars = buildDdmVariables({
        currentDividend: 3,
        growthRate: 5,
        costOfEquity: 8,
        terminalGrowth: 2,
      });
      const map = new Map(vars.map((v) => [v.symbol, v.editable]));
      expect(map.get('D₀')).toBeFalse();
      expect(map.get('g')).toBeTrue();
      expect(map.get('r')).toBeTrue();
      expect(map.get('gL')).toBeTrue();
    });
  });
});
