// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToFixedPipe } from '../../shared/pipes';
import { FinancialAlert, FinancialNode } from '../financial-hierarchy.service';

/**
 * Component for displaying hierarchical financial data with drill-down
 *
 * Features:
 * - Expandable tree structure
 * - YoY change indicators
 * - M&A and significant change alerts
 * - Click to drill down into time series
 */
@Component({
  selector: 'app-financial-drilldown',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, ToFixedPipe],
  templateUrl: './financial-drilldown.component.html',
  styleUrl: './financial-drilldown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialDrilldownComponent {
  @Input() root: FinancialNode | null = null;
  @Input() alerts: FinancialAlert[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() fiscalDate: string | null = null;

  @Output() nodeClick = new EventEmitter<FinancialNode>();

  // Track expanded nodes
  expandedNodes = signal<Set<string>>(new Set());

  /**
   * Toggle node expansion
   */
  toggleNode(nodeId: string): void {
    const current = this.expandedNodes();
    const newSet = new Set(current);
    if (newSet.has(nodeId)) {
      newSet.delete(nodeId);
    } else {
      newSet.add(nodeId);
    }
    this.expandedNodes.set(newSet);
  }

  /**
   * Check if node is expanded
   */
  isExpanded(nodeId: string): boolean {
    return this.expandedNodes().has(nodeId);
  }

  /**
   * Handle node click for drill-down
   */
  onNodeClick(node: FinancialNode, event: Event): void {
    event.stopPropagation();
    this.nodeClick.emit(node);
  }

  /**
   * Format value as currency
   */
  formatValue(value: number | null): string {
    if (value === null || value === undefined) return 'N/A';

    const absValue = Math.abs(value);
    if (absValue >= 1e12) {
      return `$${(value / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  }

  /**
   * Format YoY change with color class
   */
  getChangeClass(change: number | null): string {
    if (change === null) return '';
    if (change > 0) return 'positive';
    if (change < 0) return 'negative';
    return '';
  }

  /**
   * Format YoY change as string
   */
  formatChange(change: number | null): string {
    if (change === null) return '';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  /**
   * Check if node has M&A indicator flag
   */
  hasMaIndicator(node: FinancialNode): boolean {
    return node.flags?.includes('m&a_indicator') || false;
  }

  /**
   * Check if node has significant change flag
   */
  hasSignificantChange(node: FinancialNode): boolean {
    return node.flags?.includes('significant_change') || false;
  }

  /**
   * Get alert severity class
   */
  getAlertClass(alert: FinancialAlert): string {
    switch (alert.severity) {
      case 'high':
        return 'alert-high';
      case 'medium':
        return 'alert-medium';
      default:
        return 'alert-low';
    }
  }

  /**
   * Get indentation for tree level
   */
  getIndentStyle(level: number): Record<string, string> {
    return {
      'padding-left': `${level * 20}px`,
    };
  }
}
