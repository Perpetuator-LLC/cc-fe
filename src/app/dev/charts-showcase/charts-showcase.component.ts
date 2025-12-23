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
   * Scenario 1: 1-Tier @ 15% (Your Perspective as an Affiliate)
   *
   * You directly referred 20 users (Direct Referrals)
   * Those 20 users referred 400 more users (Indirect Referrals)
   *
   * In 1-tier, you ONLY earn on Direct Referrals. The Indirect Referrals
   * pay out to whoever directly referred them (your Direct Referrals), not you.
   *
   * Cost breakdown: Taxes 35%, AI 25%, COGS 10% = 70% total costs
   * Remaining 30% = Direct Affiliate 15% + Secondary Affiliate 15%
   *
   * Total Revenue: $42,000
   *   - Taxes (35%): $14,700
   *   - AI Costs (25%): $10,500
   *   - COGS (10%): $4,200
   *   - You: $300 (only from direct)
   *   - Your Referrals: $6,000 (they get indirect)
   *   - Company (15%): $6,300
   */
  scenario1Options: EChartsOption = {
    title: {
      text: '1-Tier: You Miss Indirect Revenue',
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
          // Level 1: Revenue sources (Direct first = top)
          { name: '20 Direct Referrals', itemStyle: { color: '#4285F4' } },
          { name: '400 Indirect Referrals', itemStyle: { color: '#9E9E9E' } },

          // Level 2: Revenue totals
          { name: 'Direct Revenue ($2K)', itemStyle: { color: '#34A853' } },
          { name: 'Indirect Revenue ($40K)', itemStyle: { color: '#BDBDBD' } },

          // Level 3: Unified cost/payout categories (order determines vertical position)
          { name: 'You @15%', itemStyle: { color: '#00BCD4' } },
          { name: 'Direct Affiliates @15%', itemStyle: { color: '#757575' } },
          { name: 'Company (15%)', itemStyle: { color: '#2E7D32' } },
          { name: 'Taxes (35%)', itemStyle: { color: '#EA4335' } },
          { name: 'AI Costs (25%)', itemStyle: { color: '#FBBC04' } },
          { name: 'COGS (10%)', itemStyle: { color: '#FF6D00' } },

          // Level 4: Final totals
          { name: 'Your Earnings: $300', itemStyle: { color: '#00BCD4' } },
          { name: 'Direct Affiliate Payout: $6,000', itemStyle: { color: '#757575' } },
          { name: 'Company Net: $6,300', itemStyle: { color: '#2E7D32' } },
          { name: 'Total Taxes: $14,700', itemStyle: { color: '#EA4335' } },
          { name: 'Total AI: $10,500', itemStyle: { color: '#FBBC04' } },
          { name: 'Total COGS: $4,200', itemStyle: { color: '#FF6D00' } },
        ],
        links: [
          // Level 1 → Level 2 (Direct FIRST to position it at top)
          { source: '20 Direct Referrals', target: 'Direct Revenue ($2K)', value: 2000 },
          {
            source: '400 Indirect Referrals',
            target: 'Indirect Revenue ($40K)',
            value: 40000,
            lineStyle: { color: '#BDBDBD', opacity: 0.5 },
          },

          // Level 2 → Level 3 (Direct flows FIRST, affiliate payouts before costs)
          { source: 'Direct Revenue ($2K)', target: 'You @15%', value: 300 },
          { source: 'Direct Revenue ($2K)', target: 'Company (15%)', value: 300 },
          { source: 'Direct Revenue ($2K)', target: 'Taxes (35%)', value: 700 },
          { source: 'Direct Revenue ($2K)', target: 'AI Costs (25%)', value: 500 },
          { source: 'Direct Revenue ($2K)', target: 'COGS (10%)', value: 200 },

          // Level 2 → Level 3 (Indirect flows - grayed)
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Direct Affiliates @15%',
            value: 6000,
            lineStyle: { color: '#BDBDBD', opacity: 0.5 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Company (15%)',
            value: 6000,
            lineStyle: { color: '#BDBDBD', opacity: 0.5 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Taxes (35%)',
            value: 14000,
            lineStyle: { color: '#BDBDBD', opacity: 0.5 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'AI Costs (25%)',
            value: 10000,
            lineStyle: { color: '#BDBDBD', opacity: 0.5 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'COGS (10%)',
            value: 4000,
            lineStyle: { color: '#BDBDBD', opacity: 0.5 },
          },

          // Level 3 → Level 4 (Totals - affiliate payouts first)
          { source: 'You @15%', target: 'Your Earnings: $300', value: 300 },
          { source: 'Direct Affiliates @15%', target: 'Direct Affiliate Payout: $6,000', value: 6000 },
          { source: 'Company (15%)', target: 'Company Net: $6,300', value: 6300 },
          { source: 'Taxes (35%)', target: 'Total Taxes: $14,700', value: 14700 },
          { source: 'AI Costs (25%)', target: 'Total AI: $10,500', value: 10500 },
          { source: 'COGS (10%)', target: 'Total COGS: $4,200', value: 4200 },
        ],
      },
    ],
  };

  /**
   * Scenario 2: 2-Tier @ 10% Direct + 5% Secondary (Your Perspective)
   *
   * You directly referred 20 users (Direct Referrals)
   * Those 20 users referred 400 more users (Indirect Referrals)
   *
   * With 2-tier, you earn on BOTH:
   * - 10% on your Direct Referrals (as the direct affiliate)
   * - 5% on Indirect Referrals (as the secondary affiliate)
   *
   * Cost breakdown: Taxes 35%, AI 25%, COGS 10% = 70% total costs
   * Remaining 30% = Direct Affiliate 10% + Secondary Affiliate 5% + Company 15%
   *
   * Total Revenue: $42,000
   *   - Taxes (35%): $14,700
   *   - AI Costs (25%): $10,500
   *   - COGS (10%): $4,200
   *   - You: $200 (direct @10%) + $2,000 (secondary @5%) = $2,200
   *   - Your Referrals: $4,000 (@10% of indirect)
   *   - Your Upline: $100 (@5% of direct)
   *   - Company (15%): $6,300
   */
  scenario2Options: EChartsOption = {
    title: {
      text: '2-Tier: You Earn from Indirect Referrals!',
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
          // Level 1: Revenue sources (Direct first = top)
          { name: '20 Direct Referrals', itemStyle: { color: '#4285F4' } },
          { name: '400 Indirect Referrals', itemStyle: { color: '#4285F4' } },

          // Level 2: Revenue totals
          { name: 'Direct Revenue ($2K)', itemStyle: { color: '#34A853' } },
          { name: 'Indirect Revenue ($40K)', itemStyle: { color: '#34A853' } },

          // Level 3: Unified cost/payout categories (affiliate payouts first = top)
          { name: 'You @10% (Direct)', itemStyle: { color: '#00BCD4' } },
          { name: 'You @5% (Secondary)', itemStyle: { color: '#F39C12' } },
          { name: 'Direct Affiliates @10%', itemStyle: { color: '#00BCD4' } },
          { name: 'Recruiter @5%', itemStyle: { color: '#9C27B0' } },
          { name: 'Company (15%)', itemStyle: { color: '#2E7D32' } },
          { name: 'Taxes (35%)', itemStyle: { color: '#EA4335' } },
          { name: 'AI Costs (25%)', itemStyle: { color: '#FBBC04' } },
          { name: 'COGS (10%)', itemStyle: { color: '#FF6D00' } },

          // Level 4: Final totals (affiliate earnings first = top)
          { name: 'Your Earnings: $2,200', itemStyle: { color: '#F39C12' } },
          { name: 'Direct Affiliate Payout: $4,000', itemStyle: { color: '#00BCD4' } },
          { name: 'Recruiter Payout: $100', itemStyle: { color: '#9C27B0' } },
          { name: 'Company Net: $6,300', itemStyle: { color: '#2E7D32' } },
          { name: 'Total Taxes: $14,700', itemStyle: { color: '#EA4335' } },
          { name: 'Total AI: $10,500', itemStyle: { color: '#FBBC04' } },
          { name: 'Total COGS: $4,200', itemStyle: { color: '#FF6D00' } },
        ],
        links: [
          // Level 1 → Level 2 (Direct FIRST to position it at top)
          { source: '20 Direct Referrals', target: 'Direct Revenue ($2K)', value: 2000 },
          { source: '400 Indirect Referrals', target: 'Indirect Revenue ($40K)', value: 40000 },

          // Level 2 → Level 3 (Direct flows FIRST)
          { source: 'Direct Revenue ($2K)', target: 'You @10% (Direct)', value: 200 },
          { source: 'Direct Revenue ($2K)', target: 'Recruiter @5%', value: 100 },
          { source: 'Direct Revenue ($2K)', target: 'Company (15%)', value: 300 },
          { source: 'Direct Revenue ($2K)', target: 'Taxes (35%)', value: 700 },
          { source: 'Direct Revenue ($2K)', target: 'AI Costs (25%)', value: 500 },
          { source: 'Direct Revenue ($2K)', target: 'COGS (10%)', value: 200 },

          // Level 2 → Level 3 (Indirect flows)
          { source: 'Indirect Revenue ($40K)', target: 'You @5% (Secondary)', value: 2000 },
          { source: 'Indirect Revenue ($40K)', target: 'Direct Affiliates @10%', value: 4000 },
          { source: 'Indirect Revenue ($40K)', target: 'Company (15%)', value: 6000 },
          { source: 'Indirect Revenue ($40K)', target: 'Taxes (35%)', value: 14000 },
          { source: 'Indirect Revenue ($40K)', target: 'AI Costs (25%)', value: 10000 },
          { source: 'Indirect Revenue ($40K)', target: 'COGS (10%)', value: 4000 },

          // Level 3 → Level 4 (Totals)
          { source: 'You @10% (Direct)', target: 'Your Earnings: $2,200', value: 200 },
          { source: 'You @5% (Secondary)', target: 'Your Earnings: $2,200', value: 2000 },
          { source: 'Direct Affiliates @10%', target: 'Direct Affiliate Payout: $4,000', value: 4000 },
          { source: 'Recruiter @5%', target: 'Recruiter Payout: $100', value: 100 },
          { source: 'Company (15%)', target: 'Company Net: $6,300', value: 6300 },
          { source: 'Taxes (35%)', target: 'Total Taxes: $14,700', value: 14700 },
          { source: 'AI Costs (25%)', target: 'Total AI: $10,500', value: 10500 },
          { source: 'COGS (10%)', target: 'Total COGS: $4,200', value: 4200 },
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
