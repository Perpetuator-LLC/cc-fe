// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Chart Info Tooltip Component
 *
 * Displays an info icon with a tooltip explaining the chart or metric.
 * Used to educate users on financial terminology and chart interpretation.
 */
@Component({
  selector: 'app-chart-info',
  standalone: true,
  imports: [CommonModule, MatIconButton, MatIconModule, MatTooltipModule],
  templateUrl: './chart-info.component.html',
  styleUrl: './chart-info.component.scss',
})
export class ChartInfoComponent {
  @Input() tooltip = '';
}
