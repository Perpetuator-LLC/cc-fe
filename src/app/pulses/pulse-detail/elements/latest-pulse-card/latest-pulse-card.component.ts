// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Pulse } from '../../../pulses.types';
import { PulseCanPlayPipe } from '../../pipes/pulse-can-play.pipe';
import { PulseFormatSecondsPipe } from '../../pipes/pulse-format-seconds.pipe';
import { PulseTimeAgoPipe } from '../../pipes/pulse-time-ago.pipe';
import { PillComponent } from '../../../../shared/ui/pill/pill.component';
import { AudioPlayerService } from '../../../../shared/audio-player/audio-player.service';
import { DynamicStyleDirective } from '../../../../shared/dynamic-style.directive';

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
    PillComponent,
    DynamicStyleDirective,
  ],
  templateUrl: './latest-pulse-card.component.html',
  styleUrl: './latest-pulse-card.component.scss',
})
export class LatestPulseCardComponent {
  protected readonly audioPlayerService = inject(AudioPlayerService);

  @Input({ required: true }) pulse!: Pulse;
  @Input() showTranscript = false;

  @Output() playPulse = new EventEmitter<Pulse>();
  @Output() queueNext = new EventEmitter<Pulse>();
  @Output() queue = new EventEmitter<Pulse>();
  @Output() toggleTranscript = new EventEmitter<void>();

  protected isCurrentPulse(): boolean {
    const track = this.audioPlayerService.track();
    return track?.type === 'pulse' && track.id === this.pulse.uuid;
  }

  protected get currentTimeText(): string {
    return this.isCurrentPulse() ? this.audioPlayerService.formatTime(this.audioPlayerService.currentTime()) : '0:00';
  }

  protected get durationText(): string {
    const duration = this.isCurrentPulse() ? this.audioPlayerService.duration() : this.pulse.audioDurationSeconds;
    return this.audioPlayerService.formatTime(duration || 0);
  }

  protected get progressPercent(): number {
    return this.isCurrentPulse() ? this.audioPlayerService.progress() : 0;
  }

  protected get progressFillStyle(): Record<string, string> {
    return { width: `${this.progressPercent}%` };
  }

  protected onProgressClick(event: MouseEvent): void {
    if (!this.isCurrentPulse()) {
      this.playPulse.emit(this.pulse);
      return;
    }

    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.audioPlayerService.seekToPercent(percent);
  }

  protected seekByStep(stepPercent: number): void {
    if (!this.isCurrentPulse()) {
      this.playPulse.emit(this.pulse);
      return;
    }

    const current = this.progressPercent;
    this.audioPlayerService.seekToPercent(Math.max(0, Math.min(100, current + stepPercent)));
  }
}
