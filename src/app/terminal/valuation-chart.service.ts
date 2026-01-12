// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { DCFAnalysisData, DCFResult, SensitivityPoint } from './valuation.service';

// Theme colors from MD3
const THEME = {
  background: 'transparent',
  textColor: 'var(--md-sys-color-on-surface)',
  textColorSecondary: 'var(--md-sys-color-on-surface-variant)',
  gridLine: 'var(--md-sys-color-outline-variant)',
  primary: '#90caf9',
  success: '#81c784',
  error: '#ef5350',
  warning: '#ffb74d',
  info: '#64b5f6',
};

@Injectable({
  providedIn: 'root',
})
export class ValuationChartService {
  /**
   * Build FCF projection chart with historical and 3 scenarios
   */
  buildFcfProjectionChart(data: DCFAnalysisData): EChartsOption {
    const chartData = data.projectionChartData;
    const dates = chartData.map((d) => this.formatDate(d.date));

    // Historical FCF (solid line)
    const historicalFcf = chartData.map((d) => (d.type === 'historical' && d.fcf ? d.fcf / 1e9 : null));

    // Scenario projections (dashed lines)
    const baseFcf = chartData.map((d) => (d.fcfBase ? d.fcfBase / 1e9 : null));
    const bullFcf = chartData.map((d) => (d.fcfBull ? d.fcfBull / 1e9 : null));
    const bearFcf = chartData.map((d) => (d.fcfBear ? d.fcfBear / 1e9 : null));

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Free Cash Flow Projections',
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
          let html = `<strong>${p[0]?.axisValue}</strong><br/>`;
          p.forEach((item) => {
            if (item.value !== null && item.value !== undefined) {
              html += `<span style="color:${item.color}">●</span> ${item.seriesName}: $${item.value.toFixed(1)}B<br/>`;
            }
          });
          return html;
        },
      },
      legend: {
        data: ['Historical', 'Base Case', 'Bull Case', 'Bear Case'],
        textStyle: { color: THEME.textColorSecondary },
        top: 30,
      },
      grid: { left: 60, right: 20, top: 70, bottom: 40 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'FCF ($B)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, formatter: '${value}B' },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          name: 'Historical',
          type: 'line',
          data: historicalFcf,
          lineStyle: { type: 'solid', width: 2 },
          itemStyle: { color: THEME.primary },
          connectNulls: false,
        },
        {
          name: 'Base Case',
          type: 'line',
          data: baseFcf,
          lineStyle: { type: 'dashed', width: 2 },
          itemStyle: { color: THEME.info },
          connectNulls: false,
        },
        {
          name: 'Bull Case',
          type: 'line',
          data: bullFcf,
          lineStyle: { type: 'dashed', width: 2 },
          itemStyle: { color: THEME.success },
          connectNulls: false,
        },
        {
          name: 'Bear Case',
          type: 'line',
          data: bearFcf,
          lineStyle: { type: 'dashed', width: 2 },
          itemStyle: { color: THEME.error },
          connectNulls: false,
        },
      ],
    };
  }

  /**
   * Build valuation comparison bar chart (current price vs scenarios)
   */
  buildValuationComparisonChart(data: DCFAnalysisData): EChartsOption {
    const summary = data.valuationSummary;

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Intrinsic Value vs Current Price',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number; color: string }[];
          return p.map((item) => `${item.name}: $${item.value.toFixed(2)}`).join('<br/>');
        },
      },
      grid: { left: 60, right: 20, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: ['Bear Case', 'Base Case', 'Bull Case', 'Current Price'],
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Price ($)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, formatter: '${value}' },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: summary.intrinsicValueBear, itemStyle: { color: THEME.error } },
            { value: summary.intrinsicValueBase, itemStyle: { color: THEME.info } },
            { value: summary.intrinsicValueBull, itemStyle: { color: THEME.success } },
            { value: summary.currentPrice, itemStyle: { color: THEME.warning } },
          ],
          barWidth: '50%',
          label: {
            show: true,
            position: 'top',
            formatter: '${c}',
            color: THEME.textColor,
          },
        },
      ],
    };
  }

  /**
   * Build enterprise value waterfall chart
   */
  buildEnterpriseValueWaterfallChart(dcfResult: DCFResult): EChartsOption {
    const pvFcf = dcfResult.presentValueFcf / 1e9;
    const pvTerminal = dcfResult.presentValueTerminal / 1e9;
    const ev = dcfResult.enterpriseValue / 1e9;
    const netDebt = dcfResult.netDebt / 1e9;
    const equityValue = dcfResult.equityValue / 1e9;

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Enterprise Value Breakdown',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }[];
          const item = p[0];
          return `${item.name}: $${Math.abs(item.value).toFixed(1)}B`;
        },
      },
      grid: { left: 80, right: 20, top: 50, bottom: 60 },
      xAxis: {
        type: 'category',
        data: ['PV of FCF', 'PV of Terminal', 'Enterprise Value', 'Less: Net Debt', 'Equity Value'],
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, rotate: 30 },
      },
      yAxis: {
        type: 'value',
        name: 'Value ($B)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, formatter: '${value}B' },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: pvFcf, itemStyle: { color: THEME.success } },
            { value: pvTerminal, itemStyle: { color: THEME.info } },
            { value: ev, itemStyle: { color: THEME.primary } },
            { value: -netDebt, itemStyle: { color: THEME.error } },
            { value: equityValue, itemStyle: { color: THEME.success } },
          ],
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: unknown) => {
              const p = params as { value: number };
              return `$${Math.abs(p.value).toFixed(1)}B`;
            },
            color: THEME.textColor,
          },
        },
      ],
    };
  }

  /**
   * Build sensitivity heatmap chart
   */
  buildSensitivityHeatmap(sensitivityGrid: SensitivityPoint[]): EChartsOption {
    // Extract unique discount rates and terminal growth rates
    const discountRates = [...new Set(sensitivityGrid.map((p) => p.discountRate))].sort((a, b) => a - b);
    const terminalGrowths = [...new Set(sensitivityGrid.map((p) => p.terminalGrowth))].sort((a, b) => a - b);

    // Build heatmap data: [x, y, value]
    const heatmapData: [number, number, number][] = [];
    sensitivityGrid.forEach((point) => {
      const x = terminalGrowths.indexOf(point.terminalGrowth);
      const y = discountRates.indexOf(point.discountRate);
      heatmapData.push([x, y, point.intrinsicValue]);
    });

    const values = sensitivityGrid.map((p) => p.intrinsicValue);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Sensitivity Analysis',
        subtext: 'Intrinsic Value by Discount Rate & Terminal Growth',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        subtextStyle: { color: THEME.textColorSecondary },
        left: 'center',
      },
      tooltip: {
        position: 'top',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { value: [number, number, number] };
          const [x, y, value] = p.value;
          return (
            `Discount Rate: ${discountRates[y].toFixed(1)}%<br/>` +
            `Terminal Growth: ${terminalGrowths[x].toFixed(1)}%<br/>` +
            `Intrinsic Value: $${value.toFixed(2)}`
          );
        },
      },
      grid: { left: 80, right: 80, top: 70, bottom: 40 },
      xAxis: {
        type: 'category',
        data: terminalGrowths.map((g) => `${g.toFixed(1)}%`),
        name: 'Terminal Growth',
        nameLocation: 'center',
        nameGap: 30,
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: discountRates.map((r) => `${r.toFixed(1)}%`),
        name: 'Discount Rate (WACC)',
        nameLocation: 'center',
        nameGap: 50,
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
        splitArea: { show: true },
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        orient: 'vertical',
        right: 10,
        top: 'center',
        inRange: {
          color: [THEME.error, THEME.warning, THEME.success],
        },
        textStyle: { color: THEME.textColorSecondary },
        formatter: (value: unknown) => `$${(value as number).toFixed(0)}`,
      },
      series: [
        {
          type: 'heatmap',
          data: heatmapData,
          label: {
            show: true,
            formatter: (params: unknown) => {
              const p = params as { value: [number, number, number] };
              return `$${p.value[2].toFixed(0)}`;
            },
            color: THEME.textColor,
            fontSize: 10,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ],
    };
  }

  /**
   * Build historical financials chart (Revenue, Net Income, FCF)
   */
  buildHistoricalFinancialsChart(data: DCFAnalysisData): EChartsOption {
    const fcfData = data.historicalFcf;
    const revenueData = data.historicalRevenue;
    const netIncomeData = data.historicalNetIncome;

    // Align dates (use FCF dates as base)
    const dates = fcfData.map((d) => this.formatDate(d.date));
    const fcfValues = fcfData.map((d) => d.value / 1e9);

    // Match revenue and net income to FCF dates
    const revenueMap = new Map(revenueData.map((d) => [d.date, d.value]));
    const netIncomeMap = new Map(netIncomeData.map((d) => [d.date, d.value]));

    const revenueValues = fcfData.map((d) => {
      const val = revenueMap.get(d.date);
      return val ? val / 1e9 : null;
    });
    const netIncomeValues = fcfData.map((d) => {
      const val = netIncomeMap.get(d.date);
      return val ? val / 1e9 : null;
    });

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Historical Financials',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'var(--md-sys-color-surface-container-high)',
        borderColor: 'var(--md-sys-color-outline)',
        textStyle: { color: THEME.textColor },
      },
      legend: {
        data: ['Revenue', 'Net Income', 'Free Cash Flow'],
        textStyle: { color: THEME.textColorSecondary },
        top: 30,
      },
      grid: { left: 60, right: 20, top: 70, bottom: 40 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Amount ($B)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, formatter: '${value}B' },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: revenueValues,
          itemStyle: { color: THEME.primary },
        },
        {
          name: 'Net Income',
          type: 'bar',
          data: netIncomeValues,
          itemStyle: { color: THEME.info },
        },
        {
          name: 'Free Cash Flow',
          type: 'line',
          data: fcfValues,
          itemStyle: { color: THEME.success },
          lineStyle: { width: 2 },
        },
      ],
    };
  }

  /**
   * Build DCF projections table data for drill-down
   */
  buildProjectionsTableData(dcfResult: DCFResult): {
    year: number;
    date: string;
    fcf: string;
    discountedFcf: string;
    growthRate: string;
  }[] {
    return dcfResult.projections.map((p) => ({
      year: p.year,
      date: this.formatDate(p.date),
      fcf: this.formatBillions(p.fcf),
      discountedFcf: this.formatBillions(p.discountedFcf),
      growthRate: `${p.growthRate.toFixed(1)}%`,
    }));
  }

  /**
   * Build Historical Valuation chart showing P/E, P/B, P/S ratios over time
   */
  buildHistoricalValuationChart(data: DCFAnalysisData): EChartsOption | null {
    const hv = data.historicalValuation;
    if (!hv || hv.length === 0) {
      return null;
    }

    const dates = hv.map((d) => this.formatDate(d.date));
    const peRatios = hv.map((d) => d.peRatio);
    const pbRatios = hv.map((d) => d.pbRatio);
    const psRatios = hv.map((d) => d.psRatio);

    // Get averages for reference lines (same on all entries)
    const avgPe = hv[0]?.avgPeRatio;

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Historical Valuation Multiples',
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
              html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${item.value.toFixed(2)}<br/>`;
            }
          });
          if (avgPe != null) {
            html += `<br/><span style="color:${THEME.textColorSecondary}">Avg P/E: ${avgPe.toFixed(2)}</span>`;
          }
          return html;
        },
      },
      legend: {
        data: ['P/E Ratio', 'P/B Ratio', 'P/S Ratio'],
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
        data: dates,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Ratio',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          name: 'P/E Ratio',
          type: 'line',
          data: peRatios,
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: THEME.primary },
          markLine:
            avgPe != null
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { type: 'dashed', color: THEME.primary, opacity: 0.5 },
                  data: [
                    {
                      yAxis: avgPe,
                      label: {
                        formatter: `Avg: ${avgPe.toFixed(1)}`,
                        color: THEME.textColorSecondary,
                        position: 'end',
                      },
                    },
                  ],
                }
              : undefined,
        },
        {
          name: 'P/B Ratio',
          type: 'line',
          data: pbRatios,
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: THEME.success },
        },
        {
          name: 'P/S Ratio',
          type: 'line',
          data: psRatios,
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: THEME.warning },
        },
      ],
    };
  }

  /**
   * Build P/E Band Chart showing current P/E relative to historical range
   */
  buildPeBandChart(data: DCFAnalysisData): EChartsOption | null {
    const hv = data.historicalValuation;
    if (!hv || hv.length === 0) {
      return null;
    }

    const dates = hv.map((d) => this.formatDate(d.date));
    const peRatios = hv.map((d) => d.peRatio ?? 0);
    const avgPe = hv[0]?.avgPeRatio ?? 0;
    const minPe = hv[0]?.minPeRatio ?? 0;
    const maxPe = hv[0]?.maxPeRatio ?? 0;

    // Create band data (min to max range)
    const bandData = hv.map(() => [minPe, maxPe]);

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'P/E Ratio Historical Range',
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
          const peItem = p.find((i) => i.seriesName === 'P/E Ratio');
          let html = `<strong>${p[0].axisValue}</strong><br/>`;
          if (peItem && peItem.value != null) {
            html += `P/E Ratio: <strong>${peItem.value.toFixed(2)}</strong><br/>`;
          }
          html += `<span style="color:${THEME.textColorSecondary}">`;
          html += `Range: ${minPe.toFixed(1)} - ${maxPe.toFixed(1)}<br/>`;
          html += `Average: ${avgPe.toFixed(1)}`;
          html += `</span>`;
          return html;
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
        data: dates,
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'P/E Ratio',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
        min: Math.floor(minPe * 0.8),
        max: Math.ceil(maxPe * 1.1),
      },
      series: [
        // Band area (min to max range)
        {
          name: 'Historical Range',
          type: 'bar',
          data: bandData.map((b) => b[1] - b[0]),
          barWidth: '100%',
          stack: 'band',
          itemStyle: { color: 'rgba(144, 202, 249, 0.15)' },
          silent: true,
        },
        // Offset bar for min value
        {
          name: 'Offset',
          type: 'bar',
          data: bandData.map(() => minPe),
          barWidth: '100%',
          stack: 'band',
          itemStyle: { color: 'transparent' },
          silent: true,
        },
        // Actual P/E line
        {
          name: 'P/E Ratio',
          type: 'line',
          data: peRatios,
          smooth: true,
          lineStyle: { width: 3, color: THEME.primary },
          itemStyle: { color: THEME.primary },
          z: 10,
        },
        // Average P/E line
        {
          name: 'Average',
          type: 'line',
          data: hv.map(() => avgPe),
          lineStyle: { type: 'dashed', width: 2, color: THEME.warning },
          itemStyle: { color: THEME.warning },
          symbol: 'none',
        },
      ],
    };
  }

  // Helper methods
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  private formatBillions(value: number): string {
    return `$${(value / 1e9).toFixed(2)}B`;
  }

  formatCurrency(value: number): string {
    return `$${value.toFixed(2)}`;
  }

  formatPercentage(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }
}
