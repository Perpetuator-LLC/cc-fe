// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditDisplayRow, EarningsHistoryTableComponent } from './earnings-history-table.component';

function makeRow(over: Partial<CreditDisplayRow> = {}): CreditDisplayRow {
  return {
    formattedDate: 'Jan 5, 2026',
    fromLabel: 'alice',
    tierDescription: 'Tier 1 (10%)',
    amount: 25,
    ...over,
  } as CreditDisplayRow;
}

describe('EarningsHistoryTableComponent', () => {
  let fixture: ComponentFixture<EarningsHistoryTableComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningsHistoryTableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(EarningsHistoryTableComponent);
    element = fixture.nativeElement as HTMLElement;
  });

  it('shows the empty message without credits', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance.hasCredits).toBeFalse();
    expect(element.querySelector('.no-data')?.textContent).toContain('No earnings yet');
  });

  it('renders a row per credit with all four columns', () => {
    fixture.componentInstance.credits = [
      makeRow(),
      makeRow({ fromLabel: 'bob', tierDescription: 'Tier 2 (5%)', amount: 5 }),
    ];
    fixture.detectChanges();
    const rows = element.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('alice');
    expect(rows[0].textContent).toContain('25 credits');
    expect(rows[1].textContent).toContain('Tier 2 (5%)');
  });
});
