// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';

/**
 * Accent color options for the left border
 */
export type KpiAccent = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'none';

/**
 * KPI Card Component
 *
 * Displays a key performance indicator with optional accent border.
 * Used consistently across valuation, fundamentals, and dividend views.
 */
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule, MatTooltipModule, MatIconModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  /** Label displayed above the value */
  @Input() label = '';

  /** Main value to display */
  @Input() value = '';

  /** Optional sub-value displayed below */
  @Input() subValue?: string;

  /** Percent change indicator (+/-) */
  @Input() changePercent?: number | null;

  /** Accent border color */
  @Input() accent: KpiAccent = 'none';

  /** Tooltip text for info icon */
  @Input() tooltip?: string;
}
