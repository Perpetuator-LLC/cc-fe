// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { getDisplayStatusText, getStatusClass, formatSeconds, formatTimeAgo } from '../../pulse-status.utils';
import { Pulse } from '../../pulses.types';

@Component({
  selector: 'app-pulse-recordings-tab',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './pulse-recordings-tab.component.html',
  styleUrl: './pulse-recordings-tab.component.scss',
})
export class PulseRecordingsTabComponent {
  @Input() pulses: Pulse[] = [];

  @Output() createRecording = new EventEmitter<void>();
  @Output() viewRecording = new EventEmitter<Pulse>();
  @Output() playPulse = new EventEmitter<Pulse>();
  @Output() queueNext = new EventEmitter<Pulse>();
  @Output() queue = new EventEmitter<Pulse>();

  canPlay(pulse: Pulse): boolean {
    return Boolean(pulse.audioUrl && (pulse.status === 'READY' || pulse.status === 'DELIVERED'));
  }

  formatSeconds(seconds: number): string {
    return formatSeconds(seconds);
  }

  formatTimeAgo(dateString: string | null | undefined): string {
    return formatTimeAgo(dateString);
  }

  getStatusClass(status: string, pulse?: Pulse): string {
    return getStatusClass(status, pulse);
  }

  getDisplayStatusText(pulse: Pulse): string {
    return getDisplayStatusText(pulse);
  }

  emitCardAction(event: MouseEvent, emitter: EventEmitter<Pulse>, pulse: Pulse): void {
    event.stopPropagation();
    emitter.emit(pulse);
  }

  openRecordingFromKeyboard(event: Event, pulse: Pulse): void {
    event.preventDefault();
    this.viewRecording.emit(pulse);
  }
}
