// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PulseConfig } from '../../pulses.types';

@Component({
  selector: 'app-pulse-detail-header',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './pulse-detail-header.component.html',
  styleUrl: './pulse-detail-header.component.scss',
})
export class PulseDetailHeaderComponent {
  @Input({ required: true }) pulseConfig!: PulseConfig;
  @Input() generatingPulse = false;

  @Output() generatePulse = new EventEmitter<void>();
  @Output() deletePulseConfig = new EventEmitter<void>();
}
