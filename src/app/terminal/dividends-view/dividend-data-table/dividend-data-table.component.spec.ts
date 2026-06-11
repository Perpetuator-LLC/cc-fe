// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DividendDataTableComponent, DividendDataTableRow } from './dividend-data-table.component';

function makeRow(year: string, over: Partial<DividendDataTableRow> = {}): DividendDataTableRow {
  return {
    year,
    formattedFreeCashFlow: '$100M',
    formattedDividendsPaid: '$40M',
    formattedFcfPayoutRatio: '40%',
    formattedNetIncomePayoutRatio: '35%',
    fcfPayoutWarning: false,
    netIncomePayoutWarning: false,
    ...over,
  };
}

describe('DividendDataTableComponent', () => {
  let fixture: ComponentFixture<DividendDataTableComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DividendDataTableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DividendDataTableComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('renders nothing without rows', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.hasRows).toBeFalse();
    expect(element.querySelector('.dividend-table-container')).toBeNull();
  });

  it('renders one column per year and flags payout warnings', () => {
    fixture.componentInstance.rows = [
      makeRow('2024'),
      makeRow('2025', { fcfPayoutWarning: true, formattedFcfPayoutRatio: '120%' }),
    ];
    fixture.detectChanges();
    const headers = Array.from(element.querySelectorAll('thead th')).map((th) => th.textContent?.trim());
    expect(headers).toEqual(['Metric', '2024', '2025']);
    expect(element.querySelectorAll('td.warning').length).toBe(1);
    expect(element.textContent).toContain('120%');
  });
});
