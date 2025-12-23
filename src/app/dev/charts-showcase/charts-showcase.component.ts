// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { SankeyChart } from 'echarts/charts';
import { TooltipComponent, TitleComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register required ECharts components
echarts.use([SankeyChart, TooltipComponent, TitleComponent, CanvasRenderer]);

/**
 * Charts Showcase Component - Development tool for testing ECharts integration
 *
 * Demonstrates Sankey charts for affiliate revenue flow visualization
 * following MD3 design guidelines.
 */
@Component({
  selector: 'app-charts-showcase',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatTabsModule, MatButtonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './charts-showcase.component.html',
  styleUrls: ['./charts-showcase.component.scss'],
})
export class ChartsShowcaseComponent {
  /**
   * Scenario 1: 1-Tier @ 15%
   * 20 T1 active affiliates, 400 T2 (grayed - no payout)
   *
   * Revenue breakdown:
   * - 20 T1 users @ $100 = $2,000 gross
   * - 12% taxes = $240
   * - 9% AI costs = $180
   * - 6% server costs = $120
   * - 3% overhead = $60
   * - 15% T1 payout = $300
   * - Company net from T1 = $1,100
   */
  scenario1Options: EChartsOption = {
    title: {
      text: 'Scenario 1: 1-Tier @ 15% (20 T1, 400 T2 no payout)',
      textStyle: {
        color: 'var(--md-sys-color-on-surface)',
        fontSize: 16,
        fontWeight: 600,
      },
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--md-sys-color-surface-container-high)',
      borderColor: 'var(--md-sys-color-outline)',
      textStyle: {
        color: 'var(--md-sys-color-on-surface)',
      },
      formatter: (params: unknown): string => {
        const p = params as { data: { name?: string; source?: string; target?: string }; value: number };
        const label = p.data.name || `${p.data.source} → ${p.data.target}`;
        return `${label}<br/>$${p.value.toLocaleString()}`;
      },
    },
    series: [
      {
        type: 'sankey',
        nodeAlign: 'justify',
        layoutIterations: 32,
        emphasis: {
          focus: 'adjacency',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
        label: {
          color: 'var(--md-sys-color-on-surface)',
          fontSize: 12,
        },
        data: [
          { name: '20 T1 Users', itemStyle: { color: '#4285F4' } },
          { name: 'Gross Revenue (T1)', itemStyle: { color: '#34A853' } },
          { name: 'Taxes (12%)', itemStyle: { color: '#EA4335' } },
          { name: 'AI Costs (9%)', itemStyle: { color: '#FBBC04' } },
          { name: 'Server Costs (6%)', itemStyle: { color: '#FF6D00' } },
          { name: 'Overhead (3%)', itemStyle: { color: '#9C27B0' } },
          { name: 'T1 Payouts @15%', itemStyle: { color: '#00BCD4' } },
          { name: 'Company Net (T1)', itemStyle: { color: '#2E7D32' } },

          // Grayed-out T2 path (no payout in 1-tier scenario)
          { name: '400 T2 Users (No Payouts)', itemStyle: { color: '#9E9E9E' } },
          { name: 'Gross Revenue (T2)', itemStyle: { color: '#BDBDBD' } },
          { name: 'Company Net (T2)', itemStyle: { color: '#E0E0E0' } },
        ],
        links: [
          { source: '20 T1 Users', target: 'Gross Revenue (T1)', value: 2000 },

          { source: 'Gross Revenue (T1)', target: 'Taxes (12%)', value: 240 },
          { source: 'Gross Revenue (T1)', target: 'AI Costs (9%)', value: 180 },
          { source: 'Gross Revenue (T1)', target: 'Server Costs (6%)', value: 120 },
          { source: 'Gross Revenue (T1)', target: 'Overhead (3%)', value: 60 },
          { source: 'Gross Revenue (T1)', target: 'T1 Payouts @15%', value: 300 },
          { source: 'Gross Revenue (T1)', target: 'Company Net (T1)', value: 1100 },

          // Grayed T2 flow (visual only)
          {
            source: '400 T2 Users (No Payouts)',
            target: 'Gross Revenue (T2)',
            value: 40000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Gross Revenue (T2)',
            target: 'Company Net (T2)',
            value: 40000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
        ],
      },
    ],
  };

  /**
   * Scenario 2: 2-Tier @ 10% T1 + 5% T2
   * 400 T2 users flowing through both payout tiers
   *
   * Revenue breakdown:
   * - 400 T2 users @ $100 = $40,000 gross
   * - 12% taxes = $4,800
   * - 9% AI costs = $3,600
   * - 6% server costs = $2,400
   * - 3% overhead = $1,200
   * - 10% T1 payout = $4,000
   * - 5% T2 payout = $2,000
   * - Company net = $22,000
   */
  scenario2Options: EChartsOption = {
    title: {
      text: 'Scenario 2: 2-Tier @ 10% T1 + 5% T2 (400 T2)',
      textStyle: {
        color: 'var(--md-sys-color-on-surface)',
        fontSize: 16,
        fontWeight: 600,
      },
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'var(--md-sys-color-surface-container-high)',
      borderColor: 'var(--md-sys-color-outline)',
      textStyle: {
        color: 'var(--md-sys-color-on-surface)',
      },
      formatter: (params: unknown): string => {
        const p = params as { data: { name?: string; source?: string; target?: string }; value: number };
        const label = p.data.name || `${p.data.source} → ${p.data.target}`;
        return `${label}<br/>$${p.value.toLocaleString()}`;
      },
    },
    series: [
      {
        type: 'sankey',
        nodeAlign: 'justify',
        layoutIterations: 32,
        emphasis: {
          focus: 'adjacency',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
        label: {
          color: 'var(--md-sys-color-on-surface)',
          fontSize: 12,
        },
        data: [
          { name: '400 T2 Users', itemStyle: { color: '#4285F4' } },
          { name: 'Gross Revenue (T2)', itemStyle: { color: '#34A853' } },

          { name: 'Taxes (12%)', itemStyle: { color: '#EA4335' } },
          { name: 'AI Costs (9%)', itemStyle: { color: '#FBBC04' } },
          { name: 'Server Costs (6%)', itemStyle: { color: '#FF6D00' } },
          { name: 'Overhead (3%)', itemStyle: { color: '#9C27B0' } },

          { name: 'T1 Payouts @10% (20 Affiliates)', itemStyle: { color: '#F39C12' } },
          { name: 'T2 Payout @5% (Upline)', itemStyle: { color: '#E67E22' } },
          { name: 'Company Net', itemStyle: { color: '#2ECC71' } },
        ],
        links: [
          { source: '400 T2 Users', target: 'Gross Revenue (T2)', value: 40000 },

          { source: 'Gross Revenue (T2)', target: 'Taxes (12%)', value: 4800 },
          { source: 'Gross Revenue (T2)', target: 'AI Costs (9%)', value: 3600 },
          { source: 'Gross Revenue (T2)', target: 'Server Costs (6%)', value: 2400 },
          { source: 'Gross Revenue (T2)', target: 'Overhead (3%)', value: 1200 },

          { source: 'Gross Revenue (T2)', target: 'T1 Payouts @10% (20 Affiliates)', value: 4000 },
          { source: 'Gross Revenue (T2)', target: 'T2 Payout @5% (Upline)', value: 2000 },

          { source: 'Gross Revenue (T2)', target: 'Company Net', value: 22000 },
        ],
      },
    ],
  };

  /**
   * Get chart initialization options for MD3 dark theme compatibility
   */
  chartInitOptions = {
    renderer: 'canvas' as const,
  };
}
