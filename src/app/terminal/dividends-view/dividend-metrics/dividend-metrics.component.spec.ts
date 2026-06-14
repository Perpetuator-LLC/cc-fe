// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DividendFormattedMetrics, DividendMetricsComponent } from './dividend-metrics.component';

function makeMetrics(over: Partial<DividendFormattedMetrics> = {}): DividendFormattedMetrics {
  return {
    currentPrice: '$101.50',
    dividendYield: '2.1%',
    ttmPayoutRatio: '40%',
    ttmFcfPayoutRatio: '35%',
    dividendCagr5Year: null,
    dividendCagr5YearValue: null,
    dividendCagr10Year: null,
    dividendCagr10YearValue: null,
    fcfCagr5Year: null,
    fcfCagr5YearValue: null,
    fcfCagr10Year: null,
    fcfCagr10YearValue: null,
    ...over,
  };
}

describe('DividendMetricsComponent', () => {
  let fixture: ComponentFixture<DividendMetricsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendMetricsComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DividendMetricsComponent);
  });

  it('renders nothing without metrics', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.dividend-metrics')).toBeNull();
  });

  it('renders a KPI card per available metric and skips nulls', () => {
    fixture.componentInstance.metrics = makeMetrics();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const cards = element.querySelectorAll('app-kpi-card');
    expect(cards.length).toBe(4);
    expect(element.textContent).toContain('$101.50');
    expect(element.textContent).toContain('2.1%');
  });
});
