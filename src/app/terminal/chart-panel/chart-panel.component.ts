// Copyright (c) 2025 Perpetuator LLC
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { EChartsOption } from 'echarts';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, CandlestickChart, ScatterChart, PieChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// Register required ECharts components
echarts.use([
  LineChart,
  BarChart,
  CandlestickChart,
  ScatterChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-chart-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './chart-panel.component.html',
  styleUrl: './chart-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartPanelComponent implements OnChanges {
  @Input() chartOptions?: EChartsOption;
  @Input() title = '';
  @Input() height = 400;
  @Input() showHeader = true;
  @Input() showToolbar = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  @Output() chartInit = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<void>();
  @Output() fullscreen = new EventEmitter<void>();

  updateOptions: EChartsOption = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chartInstance?: any;
  isFullscreen = false;

  // Chart initialization options
  chartInitOptions = {
    renderer: 'canvas' as const,
  };

  // Default dark theme options to merge with incoming options
  private darkThemeDefaults: Partial<EChartsOption> = {
    backgroundColor: 'transparent',
    textStyle: {
      color: 'var(--md-sys-color-on-surface)',
    },
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chartOptions'] && this.chartOptions) {
      // Merge with dark theme defaults
      this.updateOptions = {
        ...this.darkThemeDefaults,
        ...this.chartOptions,
      };
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChartInit(chart: any): void {
    this.chartInstance = chart;
    this.chartInit.emit(chart);
  }

  onRefresh(): void {
    this.refresh.emit();
  }

  onToggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    this.fullscreen.emit();

    // Resize chart after fullscreen toggle
    setTimeout(() => {
      this.chartInstance?.resize();
    }, 100);
  }

  downloadChart(): void {
    if (!this.chartInstance) return;

    const dataUrl = this.chartInstance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: '#1e1e1e',
    });

    const link = document.createElement('a');
    link.download = `${this.title || 'chart'}_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
}
