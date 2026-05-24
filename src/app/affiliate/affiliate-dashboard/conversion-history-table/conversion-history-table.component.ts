// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AffiliateConversion } from '../../affiliate.service';

export type ConversionDetailKind = 'rejected' | 'completed' | 'under_review' | 'none';

/**
 * Pre-computed display state attached to each conversion row.
 * Re-declared here so the sub-component does not depend on the parent's private interface.
 */
export interface ConversionDisplayRow extends AffiliateConversion {
  formattedDate: string;
  typeDisplay: 'Credits' | 'Cash';
  statusFormatted: string;
  statusClass: string;
  targetDollars: string;
  rejectionExcerpt: string;
  detailKind: ConversionDetailKind;
  detailTooltip: string;
}

/**
 * Conversion-history table extracted from AffiliateDashboard to keep parent
 * template cyclomatic complexity below 11.
 */
@Component({
  selector: 'app-conversion-history-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatIconModule, MatTableModule, MatTooltipModule],
  templateUrl: './conversion-history-table.component.html',
  styleUrls: ['./conversion-history-table.component.scss'],
})
export class ConversionHistoryTableComponent {
  @Input() conversions: ConversionDisplayRow[] = [];

  readonly displayedColumns: string[] = ['date', 'type', 'amount', 'status', 'details'];

  get hasConversions(): boolean {
    return this.conversions.length > 0;
  }
}
