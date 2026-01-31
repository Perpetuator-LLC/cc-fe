// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface AgentAction {
  tool: string;
  args: Record<string, unknown>;
  status: 'success' | 'no_results' | 'error';
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
  @Input() agentActionsJson: string | null = null;
  @Input() showHeader = true;

  get agentActions(): AgentAction[] {
    if (!this.agentActionsJson) return [];
    try {
      return JSON.parse(this.agentActionsJson);
    } catch {
      return [];
    }
  }

  getActionIcon(action: AgentAction): string {
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

  formatToolName(tool: string): string {
    return tool.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getStatusClass(status: string): string {
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

  getArgsDisplay(args: Record<string, unknown>): string {
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
