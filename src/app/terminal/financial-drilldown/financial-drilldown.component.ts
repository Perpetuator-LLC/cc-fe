// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ToFixedPipe } from '../../shared/pipes';
import { FinancialAlert, FinancialNode } from '../financial-hierarchy.service';

/** Pre-computed display state attached to each tree node. */
interface EnrichedNode extends FinancialNode {
  formattedValue: string;
  formattedChange: string;
  changeClass: string;
  hasMaIndicator: boolean;
  hasSignificantChange: boolean;
  /** Indicators rendered next to the node name; pre-flattened for a single @for. */
  indicators: { icon: string; cssClass: string; tooltip: string }[];
  hasChildren: boolean;
  isExpanded: boolean;
  /** Pre-computed expand icon, defaults to '' when there are no children. */
  expandIcon: string;
  /** Pre-formatted percentage-of-parent (or '—' placeholder). */
  formattedPercent: string;
  enrichedChildren: EnrichedNode[];
}

/** Pre-computed display state for an alert row. */
interface EnrichedAlert extends FinancialAlert {
  alertClass: string;
}

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
  imports: [CommonModule, MatIconButton, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, ToFixedPipe],
  templateUrl: './financial-drilldown.component.html',
  styleUrl: './financial-drilldown.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinancialDrilldownComponent {
  private _root = signal<FinancialNode | null>(null);
  @Input() set root(value: FinancialNode | null) {
    this._root.set(value);
  }
  get root(): FinancialNode | null {
    return this._root();
  }

  private _alerts = signal<FinancialAlert[]>([]);
  @Input() set alerts(value: FinancialAlert[]) {
    this._alerts.set(value || []);
  }
  get alerts(): FinancialAlert[] {
    return this._alerts();
  }

  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() fiscalDate: string | null = null;

  /** Pre-enriched alerts for the template (alertClass per row). */
  readonly enrichedAlerts = computed<EnrichedAlert[]>(() =>
    this._alerts().map((a) => ({ ...a, alertClass: this.getAlertClass(a) })),
  );

  /** Pre-enriched tree for the template — recomputed when root or expansion changes. */
  readonly enrichedRoot = computed<EnrichedNode | null>(() => {
    const root = this._root();
    if (!root) return null;
    const expanded = this.expandedNodes();
    return this.enrichNode(root, expanded, 0);
  });

  private enrichNode(node: FinancialNode, expanded: Set<string>, level: number): EnrichedNode {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(node.id);
    const hasMa = this.hasMaIndicator(node);
    const hasSig = this.hasSignificantChange(node);
    const indicators: { icon: string; cssClass: string; tooltip: string }[] = [];
    if (hasMa) {
      indicators.push({ icon: 'merge_type', cssClass: 'indicator ma-indicator', tooltip: 'M&A Activity Detected' });
    }
    if (hasSig) {
      indicators.push({
        icon: 'trending_up',
        cssClass: 'indicator change-indicator',
        tooltip: 'Significant YoY Change',
      });
    }
    const showPercent = node.percentageOfParent !== null && level > 0;
    return {
      ...node,
      formattedValue: this.formatValue(node.value),
      formattedChange: this.formatChange(node.yoyChange),
      changeClass: this.getChangeClass(node.yoyChange),
      hasMaIndicator: hasMa,
      hasSignificantChange: hasSig,
      indicators,
      hasChildren,
      isExpanded,
      expandIcon: hasChildren ? (isExpanded ? 'expand_more' : 'chevron_right') : '',
      formattedPercent: showPercent ? `${(node.percentageOfParent ?? 0).toFixed(1)}%` : '—',
      enrichedChildren: (node.children ?? []).map((c) => this.enrichNode(c, expanded, level + 1)),
    };
  }

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
