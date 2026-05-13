// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AlertTrigger } from '../../pulses.types';

@Component({
  selector: 'app-pulse-alert-triggers-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './pulse-alert-triggers-tab.component.html',
  styleUrl: './pulse-alert-triggers-tab.component.scss',
})
export class PulseAlertTriggersTabComponent {
  @Input() alertTriggers: AlertTrigger[] = [];
  @Input() alertTriggerColumns: string[] = [];

  @Output() addAlertTrigger = new EventEmitter<void>();
  @Output() removeAlertTrigger = new EventEmitter<string>();

  getAlertTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      breaking_news: 'breaking_news',
      price_alert: 'trending_up',
      earnings: 'attach_money',
      sec_filing: 'description',
    };
    return icons[type] ?? 'notifications';
  }
}
