// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { AudioPlayerService, AudioTrack } from './audio-player.service';

const HISTORY_STORAGE_KEY = 'audio-player-history';
const MAX_HISTORY_SIZE = 20;

/**
 * Persistent audio player bar that displays at the bottom of the screen.
 * Only visible when a track is loaded. Persists across navigation.
 */
@Component({
  selector: 'app-audio-player-bar',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatSliderModule,
    MatTooltipModule,
    MatProgressBarModule,
    MatMenuModule,
  ],
  templateUrl: './audio-player-bar.component.html',
  styleUrl: './audio-player-bar.component.scss',
})
export class AudioPlayerBarComponent {
  protected readonly audioService = inject(AudioPlayerService);
  private readonly router = inject(Router);

  showQueue = false;
  history: AudioTrack[] = [];
  private previousTrackForHistory: AudioTrack | null = null;

  constructor() {
    this.loadHistory();

    // Track history when track changes
    effect(() => {
      const currentTrack = this.audioService.track();
      if (this.previousTrackForHistory && currentTrack?.id !== this.previousTrackForHistory.id) {
        this.addToHistory(this.previousTrackForHistory);
      }
      this.previousTrackForHistory = currentTrack;
    });
  }

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

  // Queue Panel Controls
  toggleQueue(): void {
    this.showQueue = !this.showQueue;
  }

  nextTrack(): void {
    this.audioService.playNext();
  }

  previousTrack(): void {
    if (this.history.length > 0) {
      const lastTrack = this.history[0];
      // Remove from history and play
      this.history = this.history.slice(1);
      this.saveHistory();
      this.audioService.play(lastTrack);
    }
  }

  hasPreviousTrack(): boolean {
    return this.history.length > 0;
  }

  playFromQueue(trackId: string): void {
    this.audioService.skipToTrack(trackId);
  }

  removeFromQueue(event: Event, trackId: string): void {
    event.stopPropagation();
    this.audioService.removeFromQueue(trackId);
  }

  playTrack(track: AudioTrack): void {
    this.audioService.play(track);
  }

  // Get history in reverse order (oldest first) for display
  getHistoryReversed(): AudioTrack[] {
    return [...this.history].reverse();
  }

  // Navigate to the track's source page without changing playback
  navigateToTrack(track: AudioTrack): void {
    if (track.sourceRoute) {
      this.router.navigate([track.sourceRoute]);
    }
  }

  // Remove a specific track from history
  removeFromHistory(trackId: string): void {
    this.history = this.history.filter((t) => t.id !== trackId);
    this.saveHistory();
  }

  // Clear both history and queue
  clearAll(): void {
    this.history = [];
    this.saveHistory();
    this.audioService.clearQueue();
  }

  // History Management
  private addToHistory(track: AudioTrack): void {
    // Remove if already in history
    this.history = this.history.filter((t) => t.id !== track.id);
    // Add to front
    this.history.unshift(track);
    // Limit size
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, MAX_HISTORY_SIZE);
    }
    this.saveHistory();
  }

  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  private loadHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[AudioPlayerBar] Failed to load history:', e);
    }
  }

  private saveHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(this.history));
    } catch (e) {
      console.warn('[AudioPlayerBar] Failed to save history:', e);
    }
  }
}
