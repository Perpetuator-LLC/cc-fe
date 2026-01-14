// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { DCFAnalysisData, DCFResult, SensitivityPoint, DDMAnalysisData } from './valuation.service';

// Theme colors - use hex values for ECharts (CSS variables not fully supported)
const THEME = {
  background: 'transparent',
  textColor: '#e0e0e0', // Light text for dark mode
  textColorSecondary: '#a0a0a0', // Secondary text for axes/labels
  gridLine: '#353535', // Grid lines
  axisLine: '#505050', // Axis lines
  tooltipBg: '#404040', // Tooltip background
  tooltipBorder: '#606060', // Tooltip border
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
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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

    // Create lookup for valuation notes by date
    const notesByDate = new Map<string, string>();
    hv.forEach((d) => {
      if (d.valuationNote) {
        notesByDate.set(this.formatDate(d.date), d.valuationNote);
      }
    });

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Historical Valuation Multiples',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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
          // Show valuation note if available (e.g., for negative EPS years)
          const note = notesByDate.get(p[0].axisValue);
          if (note) {
            html += `<br/><span style="color:${THEME.warning}; font-style: italic">${note}</span>`;
          }
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
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
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

  /**
   * Build Price vs Valuation chart showing stock price against fair value band
   *
   * This chart shows:
   * - Historical stock price (blue line)
   * - Fair value based on average P/E (green line)
   * - Fair value band (min/max P/E * EPS)
   *
   * @param data DCF analysis data with historical valuation
   * @param yearsToShow Number of years to display (5 or 10, defaults to 10)
   */
  buildPriceVsValuationChart(data: DCFAnalysisData, yearsToShow = 10): EChartsOption | null {
    const hv = data.historicalValuation;
    if (!hv || hv.length === 0) {
      return null;
    }

    // Filter data to show only the specified number of years
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - yearsToShow);

    const filteredHv = hv.filter((point) => new Date(point.date) >= cutoffDate);
    if (filteredHv.length === 0) {
      return null;
    }

    // Get average P/E for fair value calculation
    const avgPe = hv[0]?.avgPeRatio ?? 0;
    const minPe = hv[0]?.minPeRatio ?? 0;
    const maxPe = hv[0]?.maxPeRatio ?? 0;

    // Prepare chart data
    const dates = filteredHv.map((d) => this.formatDate(d.date));
    const prices = filteredHv.map((d) => d.price);

    // Calculate fair value (avg P/E * EPS) for each point
    const fairValues = filteredHv.map((d) => {
      if (d.eps && d.eps > 0 && avgPe > 0) {
        return avgPe * d.eps;
      }
      return null;
    });

    // Calculate min/max fair value band
    const minFairValues = filteredHv.map((d) => {
      if (d.eps && d.eps > 0 && minPe > 0) {
        return minPe * d.eps;
      }
      return null;
    });

    const maxFairValues = filteredHv.map((d) => {
      if (d.eps && d.eps > 0 && maxPe > 0) {
        return maxPe * d.eps;
      }
      return null;
    });

    // Get intrinsic value for reference (currentPrice not used in chart but available via data.valuationSummary)
    const intrinsicValue = data.valuationSummary.intrinsicValueBase;

    return {
      backgroundColor: THEME.background,
      title: {
        text: `Price vs Fair Value (${yearsToShow}Y)`,
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { axisValue: string; seriesName: string; value: number; color: string }[];
          if (!p || p.length === 0) return '';
          let html = `<strong>${p[0].axisValue}</strong><br/>`;
          p.forEach((item) => {
            if (item.value !== null && item.value !== undefined && item.seriesName !== 'Value Band') {
              html += `<span style="color:${item.color}">●</span> `;
              html += `${item.seriesName}: <strong>$${item.value.toFixed(2)}</strong><br/>`;
            }
          });
          return html;
        },
      },
      legend: {
        data: ['Stock Price', 'Fair Value (Avg P/E)', 'Value Band'],
        textStyle: { color: THEME.textColorSecondary },
        top: 30,
      },
      grid: {
        left: 70,
        right: 20,
        top: 70,
        bottom: 40,
      },
      xAxis: {
        type: 'category',
        data: dates,
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
        // Value band (area between min and max fair value)
        {
          name: 'Value Band',
          type: 'line',
          data: maxFairValues,
          lineStyle: { opacity: 0 },
          areaStyle: { color: 'rgba(129, 199, 132, 0.15)' },
          stack: 'valuation-band',
          symbol: 'none',
          silent: true,
        },
        {
          name: 'Value Band Lower',
          type: 'line',
          data: minFairValues,
          lineStyle: { opacity: 0 },
          areaStyle: { color: THEME.background },
          stack: 'valuation-band',
          symbol: 'none',
          silent: true,
        },
        // Fair value line (average P/E * EPS)
        {
          name: 'Fair Value (Avg P/E)',
          type: 'line',
          data: fairValues,
          smooth: true,
          lineStyle: { width: 2, type: 'dashed' },
          itemStyle: { color: THEME.success },
          symbol: 'none',
        },
        // Stock price line
        {
          name: 'Stock Price',
          type: 'line',
          data: prices,
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: THEME.primary },
          z: 10,
        },
        // Current intrinsic value reference line
        {
          name: 'Current DCF Value',
          type: 'line',
          data: dates.map(() => intrinsicValue),
          lineStyle: { width: 1, type: 'dotted', color: THEME.warning },
          itemStyle: { color: THEME.warning },
          symbol: 'none',
          markPoint:
            intrinsicValue > 0
              ? {
                  data: [
                    {
                      name: 'DCF Value',
                      coord: [dates[dates.length - 1], intrinsicValue],
                      value: `DCF: $${intrinsicValue.toFixed(0)}`,
                      itemStyle: { color: THEME.warning },
                      label: {
                        show: true,
                        formatter: `DCF: $${intrinsicValue.toFixed(0)}`,
                        color: THEME.textColor,
                        backgroundColor: THEME.tooltipBg,
                        borderRadius: 4,
                        padding: [4, 8],
                      },
                    },
                  ],
                  symbol: 'pin',
                  symbolSize: 40,
                }
              : undefined,
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

  // ============================================================================
  // DDM (Dividend Discount Model) Charts
  // ============================================================================

  /**
   * Build DDM dividend projection chart showing historical and projected dividends
   */
  buildDdmDividendChart(data: DDMAnalysisData): EChartsOption | null {
    const chartData = data.dividendChartData;
    if (!chartData || chartData.length === 0) {
      return null;
    }

    const dates = chartData.map((d) => this.formatDate(d.date));
    const discountedDividends = chartData.map((d) => d.discountedDividend || null);

    // Separate historical from projected
    const historicalDividends = chartData.map((d) => (!d.isProjected ? d.dividendPerShare : null));
    const projectedDividends = chartData.map((d) => (d.isProjected ? d.dividendPerShare : null));

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'Dividend Projections',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { axisValue: string; seriesName: string; value: number; color: string }[];
          let html = `<strong>${p[0]?.axisValue}</strong><br/>`;
          p.forEach((item) => {
            if (item.value !== null && item.value !== undefined) {
              html += `<span style="color:${item.color}">●</span> ${item.seriesName}: $${item.value.toFixed(2)}<br/>`;
            }
          });
          return html;
        },
      },
      legend: {
        data: ['Historical', 'Projected', 'Discounted'],
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
        name: 'Dividend ($)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, formatter: '${value}' },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          name: 'Historical',
          type: 'bar',
          data: historicalDividends,
          itemStyle: { color: THEME.primary },
        },
        {
          name: 'Projected',
          type: 'bar',
          data: projectedDividends,
          itemStyle: { color: THEME.info, opacity: 0.7 },
        },
        {
          name: 'Discounted',
          type: 'line',
          data: discountedDividends,
          lineStyle: { type: 'dashed', width: 2 },
          itemStyle: { color: THEME.warning },
        },
      ],
    };
  }

  /**
   * Build DDM valuation comparison chart (intrinsic value vs current price)
   */
  buildDdmValuationChart(data: DDMAnalysisData): EChartsOption {
    return {
      backgroundColor: THEME.background,
      title: {
        text: 'DDM Valuation',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
        textStyle: { color: THEME.textColor },
      },
      grid: { left: 60, right: 20, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: ['Intrinsic Value', 'Current Price'],
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
            {
              value: data.intrinsicValue,
              itemStyle: { color: data.upsidePercentage >= 0 ? THEME.success : THEME.error },
            },
            { value: data.currentPrice, itemStyle: { color: THEME.warning } },
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
   * Build DDM value breakdown waterfall chart
   */
  buildDdmBreakdownChart(data: DDMAnalysisData): EChartsOption {
    const pvDividends = data.presentValueDividends;
    const pvTerminal = data.presentValueTerminal;
    const total = pvDividends + pvTerminal;

    return {
      backgroundColor: THEME.background,
      title: {
        text: 'DDM Value Breakdown',
        textStyle: { color: THEME.textColor, fontSize: 14 },
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: THEME.tooltipBg,
        borderColor: THEME.tooltipBorder,
        textStyle: { color: THEME.textColor },
        formatter: (params: unknown) => {
          const p = params as { name: string; value: number }[];
          const item = p[0];
          return `${item.name}: $${item.value.toFixed(2)}`;
        },
      },
      grid: { left: 100, right: 20, top: 50, bottom: 40 },
      xAxis: {
        type: 'category',
        data: ['PV of Dividends', 'PV of Terminal', 'Intrinsic Value'],
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary },
      },
      yAxis: {
        type: 'value',
        name: 'Value per Share ($)',
        nameTextStyle: { color: THEME.textColorSecondary },
        axisLine: { lineStyle: { color: THEME.gridLine } },
        axisLabel: { color: THEME.textColorSecondary, formatter: '${value}' },
        splitLine: { lineStyle: { color: THEME.gridLine, type: 'dashed' } },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: pvDividends, itemStyle: { color: THEME.primary } },
            { value: pvTerminal, itemStyle: { color: THEME.info } },
            { value: total, itemStyle: { color: THEME.success } },
          ],
          barWidth: '60%',
          label: {
            show: true,
            position: 'top',
            formatter: (params: unknown) => {
              const p = params as { value: number };
              return `$${p.value.toFixed(2)}`;
            },
            color: THEME.textColor,
          },
        },
      ],
    };
  }
}
