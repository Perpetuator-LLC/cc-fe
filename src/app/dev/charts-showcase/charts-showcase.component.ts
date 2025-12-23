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
   * Direct Revenue: 20 users @ $100 = $2,000
   *   - Taxes (35%): $700
   *   - AI Costs (25%): $500
   *   - COGS (10%): $200
   *   - You @15%: $300
   *   - Company (15%): $300
   *
   * Indirect Revenue: 400 users @ $100 = $40,000
   *   - Taxes (35%): $14,000
   *   - AI Costs (25%): $10,000
   *   - COGS (10%): $4,000
   *   - Your Direct Referrals @15%: $6,000 (they get it, not you!)
   *   - Company (15%): $6,000
   *   - You: $0 ← MISSED OPPORTUNITY
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
          // Direct Referrals flow (you earn here)
          { name: '20 Direct Referrals', itemStyle: { color: '#4285F4' } },
          { name: 'Direct Revenue ($2K)', itemStyle: { color: '#34A853' } },
          { name: 'Taxes (35%)', itemStyle: { color: '#EA4335' } },
          { name: 'AI Costs (25%)', itemStyle: { color: '#FBBC04' } },
          { name: 'COGS (10%)', itemStyle: { color: '#FF6D00' } },
          { name: 'You @15%', itemStyle: { color: '#00BCD4' } },
          { name: 'Company (15%)', itemStyle: { color: '#2E7D32' } },

          // Indirect Referrals flow (grayed - you earn NOTHING)
          { name: '400 Indirect Referrals', itemStyle: { color: '#9E9E9E' } },
          { name: 'Indirect Revenue ($40K)', itemStyle: { color: '#BDBDBD' } },
          { name: 'Indirect Taxes (35%)', itemStyle: { color: '#757575' } },
          { name: 'Indirect AI (25%)', itemStyle: { color: '#757575' } },
          { name: 'Indirect COGS (10%)', itemStyle: { color: '#757575' } },
          { name: 'Your Referrals @15%', itemStyle: { color: '#757575' } },
          { name: 'Indirect Company (15%)', itemStyle: { color: '#9E9E9E' } },
          { name: 'You: $0', itemStyle: { color: '#616161' } },
        ],
        links: [
          // Direct flow (you earn)
          { source: '20 Direct Referrals', target: 'Direct Revenue ($2K)', value: 2000 },
          { source: 'Direct Revenue ($2K)', target: 'Taxes (35%)', value: 700 },
          { source: 'Direct Revenue ($2K)', target: 'AI Costs (25%)', value: 500 },
          { source: 'Direct Revenue ($2K)', target: 'COGS (10%)', value: 200 },
          { source: 'Direct Revenue ($2K)', target: 'You @15%', value: 300 },
          { source: 'Direct Revenue ($2K)', target: 'Company (15%)', value: 300 },

          // Indirect flow (grayed - you miss out!)
          {
            source: '400 Indirect Referrals',
            target: 'Indirect Revenue ($40K)',
            value: 40000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Indirect Taxes (35%)',
            value: 14000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Indirect AI (25%)',
            value: 10000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Indirect COGS (10%)',
            value: 4000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Your Referrals @15%',
            value: 6000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'Indirect Company (15%)',
            value: 6000,
            lineStyle: { color: '#BDBDBD', opacity: 0.4 },
          },
          {
            source: 'Indirect Revenue ($40K)',
            target: 'You: $0',
            value: 1,
            lineStyle: { color: '#BDBDBD', opacity: 0.2 },
          },
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
   * Direct Revenue: 20 users @ $100 = $2,000
   *   - Taxes (35%): $700
   *   - AI Costs (25%): $500
   *   - COGS (10%): $200
   *   - You @10% (Direct): $200
   *   - Your Upline @5%: $100 (if you have one, otherwise company)
   *   - Company (15%): $300
   *
   * Indirect Revenue: 400 users @ $100 = $40,000
   *   - Taxes (35%): $14,000
   *   - AI Costs (25%): $10,000
   *   - COGS (10%): $4,000
   *   - Your Referrals @10%: $4,000 (they earn as direct affiliates)
   *   - You @5% (Secondary): $2,000 ← YOUR BONUS!
   *   - Company (15%): $6,000
   *
   * Your total: $200 + $2,000 = $2,200 (vs $300 in 1-tier!)
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
          // Direct Referrals flow
          { name: '20 Direct Referrals', itemStyle: { color: '#4285F4' } },
          { name: 'Direct Revenue ($2K)', itemStyle: { color: '#34A853' } },
          { name: 'Taxes (35%)', itemStyle: { color: '#EA4335' } },
          { name: 'AI Costs (25%)', itemStyle: { color: '#FBBC04' } },
          { name: 'COGS (10%)', itemStyle: { color: '#FF6D00' } },
          { name: 'You @10% (Direct)', itemStyle: { color: '#00BCD4' } },
          { name: 'Your Upline @5%', itemStyle: { color: '#9C27B0' } },
          { name: 'Company (15%)', itemStyle: { color: '#2E7D32' } },

          // Indirect Referrals flow (NOW YOU EARN!)
          { name: '400 Indirect Referrals', itemStyle: { color: '#4285F4' } },
          { name: 'Indirect Revenue ($40K)', itemStyle: { color: '#34A853' } },
          { name: 'Indirect Taxes (35%)', itemStyle: { color: '#EA4335' } },
          { name: 'Indirect AI (25%)', itemStyle: { color: '#FBBC04' } },
          { name: 'Indirect COGS (10%)', itemStyle: { color: '#FF6D00' } },
          { name: 'Your Referrals @10%', itemStyle: { color: '#00BCD4' } },
          { name: 'You @5% (Secondary) $2K!', itemStyle: { color: '#F39C12' } },
          { name: 'Indirect Company (15%)', itemStyle: { color: '#2E7D32' } },
        ],
        links: [
          // Direct flow
          { source: '20 Direct Referrals', target: 'Direct Revenue ($2K)', value: 2000 },
          { source: 'Direct Revenue ($2K)', target: 'Taxes (35%)', value: 700 },
          { source: 'Direct Revenue ($2K)', target: 'AI Costs (25%)', value: 500 },
          { source: 'Direct Revenue ($2K)', target: 'COGS (10%)', value: 200 },
          { source: 'Direct Revenue ($2K)', target: 'You @10% (Direct)', value: 200 },
          { source: 'Direct Revenue ($2K)', target: 'Your Upline @5%', value: 100 },
          { source: 'Direct Revenue ($2K)', target: 'Company (15%)', value: 300 },

          // Indirect flow (you earn the secondary 5%!)
          { source: '400 Indirect Referrals', target: 'Indirect Revenue ($40K)', value: 40000 },
          { source: 'Indirect Revenue ($40K)', target: 'Indirect Taxes (35%)', value: 14000 },
          { source: 'Indirect Revenue ($40K)', target: 'Indirect AI (25%)', value: 10000 },
          { source: 'Indirect Revenue ($40K)', target: 'Indirect COGS (10%)', value: 4000 },
          { source: 'Indirect Revenue ($40K)', target: 'Your Referrals @10%', value: 4000 },
          { source: 'Indirect Revenue ($40K)', target: 'You @5% (Secondary) $2K!', value: 2000 },
          { source: 'Indirect Revenue ($40K)', target: 'Indirect Company (15%)', value: 6000 },
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
