// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import {
  Gridster,
  GridsterItem,
  GridsterConfig,
  GridsterItemConfig,
  GridType,
  CompactType,
  DisplayGrid,
} from 'angular-gridster2';
import { Subscription } from 'rxjs';
import { TerminalService } from '../terminal.service';
import { ChartPanelComponent } from '../chart-panel/chart-panel.component';
import { DashboardPanel, TerminalHints } from '../terminal.types';
import { EChartsOption } from 'echarts';

interface GridsterDashboardItem extends GridsterItemConfig {
  id: string;
  chartOptions?: EChartsOption;
  title: string;
  chartId?: string;
}

@Component({
  selector: 'app-terminal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    Gridster,
    GridsterItem,
    ChartPanelComponent,
  ],
  templateUrl: './terminal-dashboard.component.html',
  styleUrl: './terminal-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalDashboardComponent implements OnInit, OnDestroy {
  options: GridsterConfig = {};
  panels: GridsterDashboardItem[] = [];
  hints: TerminalHints = {
    quickExamples: [],
    placeholderText: '',
    emptyStateMessage: '',
    dashboardHint: 'Try: AAPL CHART to create a price chart',
    chartSuggestion: 'STOCK:NASDAQ:AAPL COMMAND:CHART',
  };
  private subscriptions = new Subscription();

  constructor(private terminalService: TerminalService) {}

  ngOnInit(): void {
    this.initGridsterOptions();
    this.setupSubscriptions();

    // Load terminal hints from backend
    this.subscriptions.add(
      this.terminalService.loadTerminalHints().subscribe((hints) => {
        this.hints = hints;
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initGridsterOptions(): void {
    this.options = {
      gridType: GridType.Fit,
      compactType: CompactType.None,
      displayGrid: DisplayGrid.OnDragAndResize,
      margin: 8,
      outerMargin: true,
      outerMarginTop: null,
      outerMarginRight: null,
      outerMarginBottom: null,
      outerMarginLeft: null,
      useTransformPositioning: true,
      mobileBreakpoint: 640,
      minCols: 12,
      maxCols: 12,
      minRows: 8,
      maxRows: 100,
      maxItemCols: 100,
      minItemCols: 2,
      maxItemRows: 100,
      minItemRows: 2,
      maxItemArea: 2500,
      minItemArea: 1,
      defaultItemCols: 4,
      defaultItemRows: 4,
      fixedColWidth: 105,
      fixedRowHeight: 105,
      keepFixedHeightInMobile: false,
      keepFixedWidthInMobile: false,
      scrollSensitivity: 10,
      scrollSpeed: 20,
      enableEmptyCellClick: false,
      enableEmptyCellContextMenu: false,
      enableEmptyCellDrop: true,
      enableEmptyCellDrag: false,
      enableOccupiedCellDrop: false,
      emptyCellDragMaxCols: 50,
      emptyCellDragMaxRows: 50,
      ignoreMarginInRow: false,
      draggable: {
        enabled: true,
        ignoreContentClass: 'chart-container',
        dragHandleClass: 'drag-handle',
      },
      resizable: {
        enabled: true,
      },
      swap: false,
      pushItems: true,
      disablePushOnDrag: false,
      disablePushOnResize: false,
      pushDirections: { north: true, east: true, south: true, west: true },
      pushResizeItems: false,
      disableWindowResize: false,
      disableWarnings: false,
      scrollToNewItems: false,
      itemChangeCallback: () => this.itemChange(),
      itemResizeCallback: () => this.itemResize(),
    };
  }

  private setupSubscriptions(): void {
    // Listen for new charts from terminal commands
    this.subscriptions.add(
      this.terminalService.onChartUpdate.subscribe((update) => {
        if (update.isNew) {
          this.addChartPanel(update.chartId, update.options);
        } else {
          this.updateChartPanel(update.chartId, update.options);
        }
      }),
    );
  }

  addChartPanel(chartId: string, options: EChartsOption, title?: string): void {
    const panel: GridsterDashboardItem = {
      id: this.generateId(),
      x: 0,
      y: 0,
      cols: 6,
      rows: 4,
      chartId,
      chartOptions: options,
      title: title || `Chart ${this.panels.length + 1}`,
    };

    this.panels = [...this.panels, panel];
    this.terminalService.subscribeChart(chartId);
  }

  updateChartPanel(chartId: string, options: EChartsOption): void {
    const panelIndex = this.panels.findIndex((p) => p.chartId === chartId);
    if (panelIndex >= 0) {
      const updatedPanels = [...this.panels];
      updatedPanels[panelIndex] = {
        ...updatedPanels[panelIndex],
        chartOptions: options,
      };
      this.panels = updatedPanels;
    }
  }

  removePanel(panel: GridsterDashboardItem): void {
    if (panel.chartId) {
      this.terminalService.unsubscribeChart(panel.chartId);
    }
    this.panels = this.panels.filter((p) => p.id !== panel.id);
  }

  private itemChange(): void {
    // TODO: Save panel layout to server
  }

  private itemResize(): void {
    // Trigger chart resize
  }

  private generateId(): string {
    return `panel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Convert DashboardPanel (from schema) to GridsterDashboardItem (for gridster)
  loadPanels(panels: DashboardPanel[]): void {
    this.panels = panels.map((panel) => ({
      id: panel.id,
      x: panel.gridX,
      y: panel.gridY,
      cols: panel.gridW,
      rows: panel.gridH,
      chartId: panel.chart?.id,
      chartOptions: panel.chart?.options ? JSON.parse(panel.chart.options) : undefined,
      title: panel.titleOverride || panel.chart?.name || 'Panel',
    }));
  }

  saveDashboard(): void {
    // TODO: Implement save to server
    console.log('Saving dashboard:', this.panels);
  }

  clearDashboard(): void {
    // Unsubscribe from all charts
    this.panels.forEach((panel) => {
      if (panel.chartId) {
        this.terminalService.unsubscribeChart(panel.chartId);
      }
    });
    this.panels = [];
  }
}
