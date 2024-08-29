import { Component, TemplateRef, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { AuthService } from '../../auth.service';
import { MatButton } from '@angular/material/button';
import { MatBadge } from '@angular/material/badge';
import { ChartData } from '../../chart-data.service';
import { ControlComponent } from '../control/control.component';
import { EarningsTableComponent } from '../earnings-table/earnings-table.component';
import { CandlestickComponent } from '../candlestick/candlestick.component';
import { LayoutComponent } from '../../layout/layout.component';
import { NgTemplateOutlet } from '@angular/common';
import { ToolbarService } from '../../toolbar.service';
import dataSource from './mock-data.json';

@Component({
  selector: 'app-charts-dashboard',
  standalone: true,
  imports: [
    ControlComponent,
    CandlestickComponent,
    EarningsTableComponent,
    MatButton,
    MatBadge,
    LayoutComponent,
    NgTemplateOutlet,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  dataSource: ChartData = dataSource;
  isLoggedIn = this.authService.isLoggedIn;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    public authService: AuthService,
    private toolbarService: ToolbarService,
  ) {}

  ngAfterViewInit() {
    if (this.isLoggedIn()) {
      const viewContainerRef = this.toolbarService.getViewContainerRef();
      viewContainerRef.clear();
      viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    }
  }

  ngOnDestroy() {
    this.toolbarService.clearToolbarComponent();
  }

  handleData(data: ChartData) {
    this.dataSource = data;
  }
}
