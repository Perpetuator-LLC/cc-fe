// Copyright (c) 2026 Perpetuator LLC
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AudioPlayerService } from './audio-player.service';

/**
 * Persistent audio player bar that displays at the bottom of the screen.
 * Only visible when a track is loaded. Persists across navigation.
 */
@Component({
  selector: 'app-audio-player-bar',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSliderModule, MatTooltipModule, MatProgressBarModule],
  templateUrl: './audio-player-bar.component.html',
  styleUrl: './audio-player-bar.component.scss',
})
export class AudioPlayerBarComponent {
  protected readonly audioService = inject(AudioPlayerService);
  private readonly router = inject(Router);

  onProgressClick(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const rect = element.getBoundingClientRect();
    const percent = ((event.clientX - rect.left) / rect.width) * 100;
    this.audioService.seekToPercent(percent);
  }

  navigateToSource(): void {
    const track = this.audioService.track();
    if (track?.sourceRoute) {
      this.router.navigate([track.sourceRoute]);
    }
  }

  getTypeIcon(): string {
    const track = this.audioService.track();
    return track?.type === 'pulse' ? 'vital_signs' : 'podcasts';
  }
}
