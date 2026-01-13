// Copyright (c) 2026 Perpetuator LLC
/* Copyright (c) 2026 Perpetuator LLC */
import { Injectable } from '@angular/core';
import { EChartsOption } from 'echarts';
import { BalanceSheet, CashFlow, FundamentalsData, IncomeStatement } from './fundamentals.service';

// Tooltip params type
interface TooltipParam {
  name: string;
  seriesName: string;
  value: number;
  color: string;
}

@Injectable({
  providedIn: 'root',
})
export class FundamentalsChartService {
  // Chart colors matching MD3 theme
  private readonly COLORS = {
    primary: '#8AB4F8', // Blue
    secondary: '#81C995', // Green
    tertiary: '#F28B82', // Red/Coral
    quaternary: '#FDD663', // Yellow
    quinary: '#C58AF9', // Purple
  };

  private readonly AXIS_LABEL_COLOR = 'rgba(232, 234, 237, 0.7)';
  private readonly GRID_LINE_COLOR = 'rgba(255, 255, 255, 0.1)';

  /**
   * Generate Income Statement chart - Revenue and Net Income
   */
  buildIncomeStatementChart(data: IncomeStatement[]): EChartsOption {
    if (!data.length) return this.emptyChart('No Income Statement Data');

    const sorted = [...data].sort(
      (a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime(),
    );

    const dates = sorted.map((d) => this.formatFiscalDate(d.fiscalDateEnding));

    return {
      title: {
        text: 'Income Statement',
        left: 'center',
        textStyle: { color: '#E8EAED', fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#E8EAED' },
        formatter: (params: unknown) => this.formatTooltip(params as TooltipParam[]),
      },
      legend: {
        data: ['Revenue', 'Net Income'],
        bottom: 0,
        textStyle: { color: this.AXIS_LABEL_COLOR },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: this.AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: this.AXIS_LABEL_COLOR,
          formatter: (value: number) => this.formatAxisValue(value),
        },
        splitLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: sorted.map((d) => d.totalRevenue),
          itemStyle: { color: this.COLORS.primary },
        },
        {
          name: 'Net Income',
          type: 'bar',
          data: sorted.map((d) => d.netIncome),
          itemStyle: { color: this.COLORS.secondary },
        },
      ],
    };
  }

  /**
   * Generate EPS (Earnings Per Share) chart
   */
  buildEpsChart(data: IncomeStatement[]): EChartsOption {
    if (!data.length) return this.emptyChart('No EPS Data');

    const sorted = [...data].sort(
      (a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime(),
    );

    const dates = sorted.map((d) => this.formatFiscalDate(d.fiscalDateEnding));
    const epsData = sorted.map((d) => d.epsReported);

    // Check if we have any EPS data
    const hasEps = epsData.some((v) => v !== null && v !== undefined);
    if (!hasEps) return this.emptyChart('No EPS Data Available');

    return {
      title: {
        text: 'Earnings Per Share (EPS)',
        left: 'center',
        textStyle: { color: '#E8EAED', fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#E8EAED' },
        formatter: (params: unknown) => {
          const p = params as TooltipParam[];
          if (!p.length) return '';
          const item = p[0];
          return `<strong>${item.name}</strong><br/>EPS: $${item.value?.toFixed(2) ?? 'N/A'}`;
        },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: this.AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        name: 'EPS ($)',
        nameTextStyle: { color: this.AXIS_LABEL_COLOR },
        axisLabel: {
          color: this.AXIS_LABEL_COLOR,
          formatter: (value: number) => `$${value.toFixed(2)}`,
        },
        splitLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      series: [
        {
          name: 'EPS',
          type: 'bar',
          data: epsData,
          itemStyle: { color: this.COLORS.secondary },
          label: {
            show: true,
            position: 'top',
            formatter: '{c}',
            color: this.AXIS_LABEL_COLOR,
            fontSize: 10,
          },
        },
      ],
    };
  }

  /**
   * Generate Revenue vs Cost of Revenue chart with Gross Profit Margin line
   */
  buildRevenueChart(data: IncomeStatement[]): EChartsOption {
    if (!data.length) return this.emptyChart('No Revenue Data');

    const sorted = [...data].sort(
      (a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime(),
    );

    const dates = sorted.map((d) => this.formatFiscalDate(d.fiscalDateEnding));
    const hasGrossProfit = sorted.some((d) => d.grossProfit !== null);

    return {
      title: {
        text: 'Revenue & Profitability',
        left: 'center',
        textStyle: { color: '#E8EAED', fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#E8EAED' },
        formatter: (params: unknown) => {
          const p = params as TooltipParam[];
          if (!p.length) return '';
          let html = `<strong>${p[0].name}</strong><br/>`;
          p.forEach((item) => {
            if (item.value != null) {
              if (item.seriesName.includes('%')) {
                html += `<span style="color:${item.color}">●</span> ${item.seriesName}:
                ${(item.value as number).toFixed(1)}%<br/>`;
              } else {
                html += `<span style="color:${item.color}">●</span> ${item.seriesName}:
                ${this.formatAxisValue(item.value)}<br/>`;
              }
            }
          });
          return html;
        },
      },
      legend: {
        data: hasGrossProfit
          ? ['Revenue', 'Cost of Revenue', 'Gross Profit', 'Gross Margin %']
          : ['Revenue', 'Cost of Revenue'],
        bottom: 0,
        textStyle: { color: this.AXIS_LABEL_COLOR },
      },
      grid: {
        left: '3%',
        right: '8%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: this.AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Amount',
          nameTextStyle: { color: this.AXIS_LABEL_COLOR },
          axisLabel: {
            color: this.AXIS_LABEL_COLOR,
            formatter: (value: number) => this.formatAxisValue(value),
          },
          splitLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
        },
        {
          type: 'value',
          name: 'Margin %',
          nameTextStyle: { color: this.AXIS_LABEL_COLOR },
          axisLabel: {
            color: this.AXIS_LABEL_COLOR,
            formatter: '{value}%',
          },
          splitLine: { show: false },
          min: 0,
          max: 100,
        },
      ],
      series: this.buildRevenueSeries(sorted, hasGrossProfit),
    };
  }

  /**
   * Build series array for revenue chart
   */
  private buildRevenueSeries(data: IncomeStatement[], hasGrossProfit: boolean): EChartsOption['series'] {
    const series = [
      {
        name: 'Revenue',
        type: 'bar' as const,
        data: data.map((d) => d.totalRevenue),
        itemStyle: { color: this.COLORS.primary },
      },
      {
        name: 'Cost of Revenue',
        type: 'bar' as const,
        data: data.map((d) => d.costOfRevenue),
        itemStyle: { color: this.COLORS.tertiary },
      },
    ];

    if (hasGrossProfit) {
      series.push({
        name: 'Gross Profit',
        type: 'bar' as const,
        data: data.map((d) => d.grossProfit),
        itemStyle: { color: this.COLORS.secondary },
      });
    }

    return series;
  }

  /**
   * Generate Balance Sheet chart - Assets vs Liabilities vs Equity
   */
  buildBalanceSheetChart(data: BalanceSheet[]): EChartsOption {
    if (!data.length) return this.emptyChart('No Balance Sheet Data');

    const sorted = [...data].sort(
      (a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime(),
    );

    const dates = sorted.map((d) => this.formatFiscalDate(d.fiscalDateEnding));

    return {
      title: {
        text: 'Balance Sheet',
        left: 'center',
        textStyle: { color: '#E8EAED', fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#E8EAED' },
        formatter: (params: unknown) => this.formatTooltip(params as TooltipParam[]),
      },
      legend: {
        data: ['Total Assets', 'Total Liabilities', 'Total Equity'],
        bottom: 0,
        textStyle: { color: this.AXIS_LABEL_COLOR },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: this.AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: this.AXIS_LABEL_COLOR,
          formatter: (value: number) => this.formatAxisValue(value),
        },
        splitLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      series: [
        {
          name: 'Total Assets',
          type: 'bar',
          data: sorted.map((d) => d.totalAssets),
          itemStyle: { color: this.COLORS.primary },
        },
        {
          name: 'Total Liabilities',
          type: 'bar',
          data: sorted.map((d) => d.totalLiabilities),
          itemStyle: { color: this.COLORS.tertiary },
        },
        {
          name: 'Total Equity',
          type: 'bar',
          data: sorted.map((d) => d.totalEquity),
          itemStyle: { color: this.COLORS.secondary },
        },
      ],
    };
  }

  /**
   * Generate Cash Flow chart - Operating Cash Flow and Dividends
   */
  buildCashFlowChart(data: CashFlow[]): EChartsOption {
    if (!data.length) return this.emptyChart('No Cash Flow Data');

    const sorted = [...data].sort(
      (a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime(),
    );

    const dates = sorted.map((d) => this.formatFiscalDate(d.fiscalDateEnding));

    return {
      title: {
        text: 'Cash Flow Statement',
        left: 'center',
        textStyle: { color: '#E8EAED', fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#E8EAED' },
        formatter: (params: unknown) => this.formatTooltip(params as TooltipParam[]),
      },
      legend: {
        data: ['Operating Cash Flow', 'Dividend Payout'],
        bottom: 0,
        textStyle: { color: this.AXIS_LABEL_COLOR },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: this.AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: this.AXIS_LABEL_COLOR,
          formatter: (value: number) => this.formatAxisValue(value),
        },
        splitLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      series: [
        {
          name: 'Operating Cash Flow',
          type: 'bar',
          data: sorted.map((d) => d.operatingCashFlow),
          itemStyle: { color: this.COLORS.secondary },
        },
        {
          name: 'Dividend Payout',
          type: 'bar',
          data: sorted.map((d) => d.dividendPayout),
          itemStyle: { color: this.COLORS.quinary },
        },
      ],
    };
  }

  /**
   * Generate Debt chart - Short Term vs Long Term Debt
   */
  buildDebtChart(data: BalanceSheet[]): EChartsOption {
    if (!data.length) return this.emptyChart('No Debt Data');

    const sorted = [...data].sort(
      (a, b) => new Date(a.fiscalDateEnding).getTime() - new Date(b.fiscalDateEnding).getTime(),
    );

    const dates = sorted.map((d) => this.formatFiscalDate(d.fiscalDateEnding));

    return {
      title: {
        text: 'Debt Structure',
        left: 'center',
        textStyle: { color: '#E8EAED', fontSize: 16 },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(32, 33, 36, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        textStyle: { color: '#E8EAED' },
        formatter: (params: unknown) => this.formatTooltip(params as TooltipParam[]),
      },
      legend: {
        data: ['Short Term Debt', 'Long Term Debt'],
        bottom: 0,
        textStyle: { color: this.AXIS_LABEL_COLOR },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: this.AXIS_LABEL_COLOR },
        axisLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: this.AXIS_LABEL_COLOR,
          formatter: (value: number) => this.formatAxisValue(value),
        },
        splitLine: { lineStyle: { color: this.GRID_LINE_COLOR } },
      },
      series: [
        {
          name: 'Short Term Debt',
          type: 'bar',
          stack: 'debt',
          data: sorted.map((d) => d.shortTermDebt),
          itemStyle: { color: this.COLORS.quaternary },
        },
        {
          name: 'Long Term Debt',
          type: 'bar',
          stack: 'debt',
          data: sorted.map((d) => d.longTermDebt),
          itemStyle: { color: this.COLORS.tertiary },
        },
      ],
    };
  }

  /**
   * Build all fundamentals charts
   * @param data Fundamentals data
   * @param isAnnual True for annual data (show year only), false for quarterly (show quarter/month)
   */
  buildAllCharts(
    data: FundamentalsData,
    isAnnual = true,
  ): {
    incomeStatement: EChartsOption;
    balanceSheet: EChartsOption;
    cashFlow: EChartsOption;
    margins: EChartsOption;
    eps: EChartsOption;
    revenue: EChartsOption;
  } {
    // Store isAnnual for date formatting
    this.currentIsAnnual = isAnnual;

    return {
      incomeStatement: this.buildIncomeStatementChart(data.incomeStatements),
      balanceSheet: this.buildBalanceSheetChart(data.balanceSheets),
      cashFlow: this.buildCashFlowChart(data.cashFlows),
      margins: this.buildDebtChart(data.balanceSheets), // Using debt chart instead of margins
      eps: this.buildEpsChart(data.incomeStatements),
      revenue: this.buildRevenueChart(data.incomeStatements),
    };
  }

  // Track if current data is annual (for date formatting)
  private currentIsAnnual = true;

  /**
   * Format fiscal date for display
   * For annual data: show year only (e.g., "2024")
   * For quarterly data: show quarter/month and year (e.g., "Q4 2024" or "Dec 2024")
   */
  private formatFiscalDate(date: string): string {
    const d = new Date(date);
    if (this.currentIsAnnual) {
      // Annual: show just the year
      return d.getFullYear().toString();
    } else {
      // Quarterly: show month and year
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
  }

  /**
   * Format axis values (billions, millions)
   */
  private formatAxisValue(value: number): string {
    if (Math.abs(value) >= 1e12) {
      return `$${(value / 1e12).toFixed(1)}T`;
    } else if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(1)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(0)}M`;
    }
    return `$${value.toFixed(0)}`;
  }

  /**
   * Format tooltip
   */
  private formatTooltip(params: TooltipParam[]): string {
    if (!Array.isArray(params)) return '';
    let html = `<strong>${params[0]?.name}</strong><br/>`;
    params.forEach((item) => {
      const formattedValue = this.formatLargeNumber(item.value);
      html += `<span style="color:${item.color}">●</span> ${item.seriesName}: ${formattedValue}<br/>`;
    });
    return html;
  }

  /**
   * Format large numbers for display
   */
  private formatLargeNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';

    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (absValue >= 1e12) {
      return `${sign}$${(absValue / 1e12).toFixed(2)}T`;
    } else if (absValue >= 1e9) {
      return `${sign}$${(absValue / 1e9).toFixed(2)}B`;
    } else if (absValue >= 1e6) {
      return `${sign}$${(absValue / 1e6).toFixed(2)}M`;
    } else if (absValue >= 1e3) {
      return `${sign}$${(absValue / 1e3).toFixed(2)}K`;
    }
    return `${sign}$${absValue.toFixed(0)}`;
  }

  /**
   * Empty chart placeholder
   */
  private emptyChart(message: string): EChartsOption {
    return {
      title: {
        text: message,
        left: 'center',
        top: 'center',
        textStyle: { color: 'rgba(232, 234, 237, 0.5)', fontSize: 14 },
      },
    };
  }
}
