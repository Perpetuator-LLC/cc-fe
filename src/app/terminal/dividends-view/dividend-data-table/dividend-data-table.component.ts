// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Pre-enriched yearly row used by the dividend data table. */
export interface DividendDataTableRow {
  year: string;
  formattedFreeCashFlow: string;
  formattedDividendsPaid: string;
  formattedFcfPayoutRatio: string;
  formattedNetIncomePayoutRatio: string;
  fcfPayoutWarning: boolean;
  netIncomePayoutWarning: boolean;
}

@Component({
  selector: 'app-dividend-data-table',
  standalone: true,
  imports: [],
  templateUrl: './dividend-data-table.component.html',
  styleUrls: ['./dividend-data-table.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividendDataTableComponent {
  @Input() rows: DividendDataTableRow[] = [];

  get hasRows(): boolean {
    return this.rows.length > 0;
  }
}
