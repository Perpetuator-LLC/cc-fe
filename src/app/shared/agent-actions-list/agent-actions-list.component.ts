// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface AgentAction {
  tool?: string;
  args?: Record<string, unknown>;
  status?: 'success' | 'no_results' | 'error';
  result_count?: number;
  result_summary?: string;
  items?: {
    title?: string;
    url?: string;
    source?: string;
    publishedAt?: string;
  }[];
  error?: string;
}

@Component({
  selector: 'app-agent-actions-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './agent-actions-list.component.html',
  styleUrl: './agent-actions-list.component.scss',
})
export class AgentActionsListComponent {
  @Input() showHeader = true;

  /**
   * Parsed + enriched agent actions for the template. Setter on the JSON
   * input parses once and pre-computes per-row display strings so the
   * template reads property access instead of method calls.
   */
  agentActions: (AgentAction & {
    icon: string;
    formattedToolName: string;
    statusClass: string;
    argsDisplay: string;
    topItems: NonNullable<AgentAction['items']>;
    extraItemCount: number;
  })[] = [];

  private _agentActionsJson: string | null = null;
  @Input() set agentActionsJson(value: string | null) {
    this._agentActionsJson = value;
    this.agentActions = this.parseAndEnrich(value);
  }
  get agentActionsJson(): string | null {
    return this._agentActionsJson;
  }

  private parseAndEnrich(json: string | null): AgentActionsListComponent['agentActions'] {
    if (!json) return [];
    try {
      let parsed = JSON.parse(json);
      // Handle double-encoded JSON from backend (JSONString field)
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (!Array.isArray(parsed)) {
        console.warn('[AgentActions] Expected array, got:', typeof parsed);
        return [];
      }
      return (parsed as AgentAction[]).map((a) => {
        const items = a.items ?? [];
        return {
          ...a,
          icon: this.getActionIcon(a),
          formattedToolName: this.formatToolName(a.tool),
          statusClass: this.getStatusClass(a.status),
          argsDisplay: this.getArgsDisplay(a.args),
          topItems: items.slice(0, 3),
          extraItemCount: Math.max(0, items.length - 3),
        };
      });
    } catch (e) {
      console.error('[AgentActions] Failed to parse:', e);
      return [];
    }
  }

  getActionIcon(action: AgentAction): string {
    if (!action) return 'build';
    if (action.status === 'error') return 'error';
    if (action.status === 'no_results') return 'search_off';

    switch (action.tool) {
      case 'search_news':
        return 'search';
      case 'get_stock_info':
        return 'trending_up';
      case 'get_watchlist_contents':
        return 'list';
      case 'get_news_from_rss_feed':
      case 'fetch_news_from_rss_url':
        return 'rss_feed';
      case 'get_news_for_symbol':
        return 'newspaper';
      case 'get_company_fundamentals':
        return 'analytics';
      case 'get_price_changes':
        return 'show_chart';
      case 'search_rss_feeds':
        return 'rss_feed';
      default:
        return 'build';
    }
  }

  formatToolName(tool: string | undefined): string {
    if (!tool) return 'Unknown Action';
    return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getStatusClass(status: string | undefined): string {
    if (!status) return '';
    switch (status) {
      case 'success':
        return 'status-success';
      case 'no_results':
        return 'status-warning';
      case 'error':
        return 'status-error';
      default:
        return '';
    }
  }

  getArgsDisplay(args: Record<string, unknown> | undefined): string {
    if (!args) return '';
    const entries = Object.entries(args);
    if (entries.length === 0) return '';

    return entries.map(([key, value]) => `${key}: ${this.formatValue(value)}`).join(', ');
  }

  private formatValue(value: unknown): string {
    if (typeof value === 'string') {
      return value.length > 30 ? value.substring(0, 30) + '...' : value;
    }
    return String(value);
  }
}
