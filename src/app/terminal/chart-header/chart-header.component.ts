// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';

/**
 * Crosshair data for OHLC display
 */
export interface CrosshairData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  isPositive: boolean;
}

/**
 * Chart settings state
 */
export interface ChartSettings {
  showCorporateActions: boolean;
  showExtendedHours: boolean;
  useLocalTime: boolean;
  adjustForDividends: boolean;
  showRawData: boolean;
  showVolume: boolean;
  lockToRight: boolean;
}

/**
 * Chart Header Component
 *
 * Displays the OHLC header with interval selector and chart settings.
 * Extracted from watchlist-tab for better maintainability.
 */
@Component({
  selector: 'app-chart-header',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDividerModule,
  ],
  templateUrl: './chart-header.component.html',
  styleUrl: './chart-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartHeaderComponent {
  /** Available interval options */
  @Input() intervalOptions: string[] = [];

  /** Currently selected interval */
  @Input() selectedInterval = 'daily';

  /** Crosshair OHLC data */
  @Input() crosshairData: CrosshairData | null = null;

  /** Chart loading state */
  @Input() chartLoading = false;

  /** Chart error message */
  @Input() chartError: string | null = null;

  /** Chart settings */
  @Input() settings: ChartSettings = {
    showCorporateActions: true,
    showExtendedHours: false,
    useLocalTime: false,
    adjustForDividends: false,
    showRawData: false,
    showVolume: true,
    lockToRight: true,
  };

  /** Whether current interval is daily or longer */
  @Input() isCurrentIntervalDailyOrLonger = true;

  /** Whether current interval is intraday */
  @Input() isIntradayInterval = false;

  /** Emitted when interval changes */
  @Output() intervalChange = new EventEmitter<string>();

  /** Emitted when refresh is clicked */
  @Output() refresh = new EventEmitter<void>();

  /** Emitted when lock to right is toggled */
  @Output() lockToRightChange = new EventEmitter<boolean>();

  /** Emitted when a setting is toggled */
  @Output() settingChange = new EventEmitter<{ setting: keyof ChartSettings; value: boolean }>();

  onIntervalChange(interval: string): void {
    this.intervalChange.emit(interval);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onLockToRightToggle(): void {
    this.lockToRightChange.emit(!this.settings.lockToRight);
  }

  onSettingToggle(setting: keyof ChartSettings): void {
    this.settingChange.emit({ setting, value: !this.settings[setting] });
  }

  formatInterval(interval: string): string {
    const labels: Record<string, string> = {
      '1min': '1m',
      '5min': '5m',
      '15min': '15m',
      '30min': '30m',
      '60min': '1h',
      daily: 'D',
      weekly: 'W',
      monthly: 'M',
    };
    return labels[interval] || interval;
  }

  formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) return '-';
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatVolume(volume: number): string {
    if (volume >= 1e9) return (volume / 1e9).toFixed(2) + 'B';
    if (volume >= 1e6) return (volume / 1e6).toFixed(2) + 'M';
    if (volume >= 1e3) return (volume / 1e3).toFixed(1) + 'K';
    return volume.toString();
  }

  formatCrosshairDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (this.isIntradayInterval) {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
