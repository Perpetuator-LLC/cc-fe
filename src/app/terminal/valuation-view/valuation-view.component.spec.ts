// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ValuationViewComponent } from './valuation-view.component';
import { DCFAnalysisData, DDMAnalysisData } from '../valuation.service';

function makeDcf(over: Partial<DCFAnalysisData> = {}): DCFAnalysisData {
  return {
    valuationSummary: { currentPrice: 100, intrinsicValueBase: 150 },
    tradingCurrency: 'USD',
    reportingCurrency: 'USD',
    ...over,
  } as unknown as DCFAnalysisData;
}

function makeDdm(over: Partial<DDMAnalysisData> = {}): DDMAnalysisData {
  return {
    currentPrice: 50,
    intrinsicValue: 40,
    modelType: 'gordon',
    summaryStats: { yearsOfDividendData: 12 },
    ...over,
  } as unknown as DDMAnalysisData;
}

describe('ValuationViewComponent', () => {
  let fixture: ComponentFixture<ValuationViewComponent>;
  let component: ValuationViewComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValuationViewComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(ValuationViewComponent);
    component = fixture.componentInstance;
  });

  describe('display price', () => {
    it('prefers a positive live price over analysis price', () => {
      component.dcfData = makeDcf();
      component.livePrice = 123;
      expect(component.getDisplayPrice('dcf')).toBe(123);
      expect(component.isUsingLivePrice()).toBeTrue();
      expect(component.dcfDisplayPrice()).toBe(123);
    });

    it('falls back to the per-model analysis price', () => {
      component.livePrice = null;
      component.dcfData = makeDcf({ valuationSummary: { currentPrice: 100, intrinsicValueBase: 150 } } as never);
      component.ddmData = makeDdm({ currentPrice: 50 });
      expect(component.getDisplayPrice('dcf')).toBe(100);
      expect(component.getDisplayPrice('ddm')).toBe(50);
      expect(component.isUsingLivePrice()).toBeFalse();
    });

    it('returns 0 when no data and no live price exist', () => {
      expect(component.getDisplayPrice('dcf')).toBe(0);
      expect(component.getDisplayPrice('ddm')).toBe(0);
    });

    it('ignores a non-positive live price', () => {
      component.dcfData = makeDcf();
      component.livePrice = 0;
      expect(component.getDisplayPrice('dcf')).toBe(100);
      expect(component.isUsingLivePrice()).toBeFalse();
    });
  });

  describe('display upside', () => {
    it('computes the percentage gap between intrinsic value and price', () => {
      component.dcfData = makeDcf({
        valuationSummary: { currentPrice: 100, intrinsicValueBase: 150 },
      } as never);
      // (150 - 100) / 100 * 100 = 50%
      expect(component.getDisplayUpside('dcf')).toBe(50);
      expect(component.dcfDisplayUpside()).toBe(50);

      component.ddmData = makeDdm({ currentPrice: 50, intrinsicValue: 40 });
      // (40 - 50) / 50 * 100 = -20%
      expect(component.getDisplayUpside('ddm')).toBe(-20);
    });

    it('returns 0 when price or intrinsic value is missing', () => {
      expect(component.getDisplayUpside('dcf')).toBe(0);
      component.dcfData = makeDcf({ valuationSummary: { currentPrice: 100, intrinsicValueBase: 0 } } as never);
      expect(component.getDisplayUpside('dcf')).toBe(0);
    });
  });

  describe('model type formatting', () => {
    it('maps known model types and passes through unknown ones', () => {
      expect(component.formatModelType('gordon')).toBe('Gordon Growth');
      expect(component.formatModelType('TWO_STAGE')).toBe('Two-Stage Growth');
      expect(component.formatModelType('h_model')).toBe('H-Model (Declining Growth)');
      expect(component.formatModelType('mystery')).toBe('mystery');
    });

    it('exposes the loaded DDM model type and years as labels', () => {
      expect(component.ddmModelTypeLabel()).toBe('');
      component.ddmData = makeDdm({ modelType: 'two_stage' });
      expect(component.ddmModelTypeLabel()).toBe('Two-Stage Growth');
      expect(component.ddmYearsOfData()).toBe('12');
    });
  });

  describe('model, drill-down and currency warning', () => {
    it('changes the selected model and emits', () => {
      const emitted: string[] = [];
      component.modelChange.subscribe((m) => emitted.push(m));
      component.onModelChange('ddm');
      expect(component.selectedModel()).toBe('ddm');
      expect(emitted).toEqual(['ddm']);
    });

    it('applies the model input only when truthy', () => {
      component.model = 'ddm';
      expect(component.selectedModel()).toBe('ddm');
      component.model = '' as never;
      expect(component.selectedModel()).toBe('ddm');
    });

    it('sets the drill-down view and forwards historical-year changes', () => {
      const years: number[] = [];
      component.historicalYearsChange.subscribe((y) => years.push(y));
      component.setDrillDown('historical');
      expect(component.drillDown()).toBe('historical');
      component.onHistoricalYearsChange(5);
      expect(years).toEqual([5]);
    });

    it('shows the DCF currency warning only on a cross-currency DCF model', () => {
      component.dcfData = makeDcf({
        currencyNote: 'converted',
        tradingCurrency: 'EUR',
        reportingCurrency: 'USD',
      } as never);
      component.onModelChange('dcf');
      expect(component.showDcfCurrencyWarning()).toBeTrue();

      component.onModelChange('ddm');
      expect(component.showDcfCurrencyWarning()).toBeFalse();
    });
  });
});
