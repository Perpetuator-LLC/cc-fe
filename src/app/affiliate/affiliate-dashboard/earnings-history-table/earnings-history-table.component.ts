// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { AffiliateCredit } from '../../affiliate.service';

/** Pre-computed display state attached to each credit row. */
export interface CreditDisplayRow extends AffiliateCredit {
  formattedDate: string;
  tierDescription: 'Tier 1 (10%)' | 'Tier 2 (5%)';
  fromLabel: string;
}

/**
 * Earnings-history table extracted from AffiliateDashboard so the parent
 * template stays below the cyclomatic-complexity threshold.
 */
@Component({
  selector: 'app-earnings-history-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatTableModule],
  templateUrl: './earnings-history-table.component.html',
  styleUrls: ['./earnings-history-table.component.scss'],
})
export class EarningsHistoryTableComponent {
  @Input() credits: CreditDisplayRow[] = [];

  readonly displayedColumns: string[] = ['date', 'from', 'type', 'amount'];

  get hasCredits(): boolean {
    return this.credits.length > 0;
  }
}
