// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { DividendAnalysisData } from './dividend.service';

// Theme colors from MD3
const THEME = {
  background: 'transparent',
  textColor: 'var(--md-sys-color-on-surface)',
  textColorSecondary: 'var(--md-sys-color-on-surface-variant)',
  gridLine: 'var(--md-sys-color-outline-variant)',
  primary: '#90caf9', // Dividends
  success: '#81c784', // FCF
  warning: '#ffb74d', // Operating Cash Flow
  error: '#ef5350',
  info: '#64b5f6',
};

@Injectable({
  providedIn: 'root',
})
export class DividendChartService {
  /**
   * Build FCF Payout Ratio chart over time
   */
  buildFcfPayoutRatioChart(data: DividendAnalysisData): EChartsOption {
    const years = data.yearlyData.map((d) => d.year);
    const fcfPayoutRatios = data.yearlyData.map((d) => (d.fcfPayoutRatio ? d.fcfPayoutRatio * 100 : null));
    const netIncomePayoutRatios = data.yearlyData.map((d) =>
      d.netIncomePayoutRatio ? d.netIncomePayoutRatio * 100 : null,
    );

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Payout Ratios Over Time',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { axisValue: string; seriesName: string; value: number; color: string }[];
          if (!p || p.length === 0) return '';
          let html = `<strong>${p[0].axisValue}</strong><br/>`;
          p.forEach((item) => {
            if (item.value != null) {
              html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${item.value.toFixed(1)}%<br/>`;
            }
          });
          return html;
        },
      },
      legend: {
        data: ['FCF Payout Ratio', 'Net Income Payout Ratio'],
        bottom: 0,
        textStyle: { color: THEME.textColorSecondary },
      },
      grid: {
        left: 60,
        right: 20,
        top: 50,
        bottom: 50,
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Payout %',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: {
          color: THEME.textColorSecondary,
          formatter: '{value}%',
        },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
        max: 150, // Cap at 150% for visibility
      },
      series: [
        {
          name: 'FCF Payout Ratio',
          type: 'line',
          data: fcfPayoutRatios,
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: THEME.success },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(129, 199, 132, 0.3)' },
                { offset: 1, color: 'rgba(129, 199, 132, 0)' },
              ],
            },
          },
        },
        {
          name: 'Net Income Payout Ratio',
          type: 'line',
          data: netIncomePayoutRatios,
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: THEME.info },
        },
      ],
    };
  }

  /**
   * Build yearly dividends bar chart
   */
  buildYearlyDividendsChart(data: DividendAnalysisData): EChartsOption {
    const years = data.yearlyData.map((d) => d.year);
    const dividends = data.yearlyData.map((d) => (d.dividendPayout ? Math.abs(d.dividendPayout) / 1e9 : 0));

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Annual Dividend Payouts',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { axisValue: string; value: number }[];
          if (!p || p.length === 0) return '';
          return `<strong>${p[0].axisValue}</strong><br/>Dividends: $${p[0].value.toFixed(2)}B`;
        },
      },
      grid: {
        left: 60,
        right: 20,
        top: 50,
        bottom: 30,
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Dividends ($B)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: {
          color: THEME.textColorSecondary,
          formatter: '${value}B',
        },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          name: 'Dividends',
          type: 'bar',
          data: dividends,
          itemStyle: {
            color: THEME.primary,
            borderRadius: [4, 4, 0, 0],
          },
          barMaxWidth: 40,
        },
      ],
    };
  }

  /**
   * Build FCF vs Dividends vs Operating Cash Flow comparison chart
   */
  buildCashFlowComparisonChart(data: DividendAnalysisData, showOperatingCashFlow = false): EChartsOption {
    const years = data.yearlyData.map((d) => d.year);
    const dividends = data.yearlyData.map((d) => (d.dividendPayout ? Math.abs(d.dividendPayout) / 1e9 : 0));
    const fcf = data.yearlyData.map((d) => (d.freeCashFlow ? Math.abs(d.freeCashFlow) / 1e9 : 0));
    const operatingCf = data.yearlyData.map((d) => (d.operatingCashFlow ? Math.abs(d.operatingCashFlow) / 1e9 : 0));

    const series: EChartsOption['series'] = [
      {
        name: 'Free Cash Flow',
        type: 'bar',
        data: fcf,
        itemStyle: {
          color: THEME.success,
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 30,
      },
      {
        name: 'Dividend Payouts',
        type: 'bar',
        data: dividends,
        itemStyle: {
          color: THEME.primary,
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 30,
      },
    ];

    const legendData = ['Free Cash Flow', 'Dividend Payouts'];

    if (showOperatingCashFlow) {
      series.unshift({
        name: 'Operating Cash Flow',
        type: 'bar',
        data: operatingCf,
        itemStyle: {
          color: THEME.warning,
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 30,
      });
      legendData.unshift('Operating Cash Flow');
    }

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Cash Flow vs Dividends',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { axisValue: string; seriesName: string; value: number; color: string }[];
          if (!p || p.length === 0) return '';
          let html = `<strong>${p[0].axisValue}</strong><br/>`;
          p.forEach((item) => {
            html += `<span style="color:${item.color}">●</span> ${item.seriesName}: $${item.value.toFixed(2)}B<br/>`;
          });
          return html;
        },
      },
      legend: {
        data: legendData,
        bottom: 0,
        textStyle: { color: THEME.textColorSecondary },
      },
      grid: {
        left: 60,
        right: 20,
        top: 50,
        bottom: 50,
      },
      xAxis: {
        type: 'category',
        data: years,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Amount ($B)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: {
          color: THEME.textColorSecondary,
          formatter: '${value}B',
        },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series,
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number | null): string {
    if (value === null) return 'N/A';
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    }
    return `$${value.toFixed(2)}`;
  }

  /**
   * Format percentage for display
   */
  formatPercent(value: number | null): string {
    if (value === null) return 'N/A';
    return `${value.toFixed(1)}%`;
  }
}
