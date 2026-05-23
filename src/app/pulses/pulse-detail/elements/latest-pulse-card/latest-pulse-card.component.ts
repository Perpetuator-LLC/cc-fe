// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Pulse } from '../../../pulses.types';
import { PulseCanPlayPipe } from '../../pipes/pulse-can-play.pipe';
import { PulseFormatSecondsPipe } from '../../pipes/pulse-format-seconds.pipe';
import { PulseTimeAgoPipe } from '../../pipes/pulse-time-ago.pipe';

@Component({
  selector: 'app-latest-pulse-card',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    PulseCanPlayPipe,
    PulseFormatSecondsPipe,
    PulseTimeAgoPipe,
  ],
  templateUrl: './latest-pulse-card.component.html',
  styleUrl: './latest-pulse-card.component.scss',
})
export class LatestPulseCardComponent {
  @Input({ required: true }) pulse!: Pulse;
  @Input() showTranscript = false;

  @Output() playPulse = new EventEmitter<Pulse>();
  @Output() queueNext = new EventEmitter<Pulse>();
  @Output() queue = new EventEmitter<Pulse>();
  @Output() toggleTranscript = new EventEmitter<void>();
}
