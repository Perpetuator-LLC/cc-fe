// Copyright (c) 2026 Perpetuator LLC
import { Component, inject, effect, ViewChild, ElementRef, AfterViewChecked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { AudioPlayerService, AudioTrack } from './audio-player.service';
import { DynamicStyleDirective } from '../dynamic-style.directive';

const HISTORY_STORAGE_KEY = 'audio-player-history';
const MAX_HISTORY_SIZE = 10;

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
    DynamicStyleDirective,
  ],
  templateUrl: './audio-player-bar.component.html',
  styleUrl: './audio-player-bar.component.scss',
})
export class AudioPlayerBarComponent implements AfterViewChecked {
  protected readonly audioService = inject(AudioPlayerService);
  private readonly router = inject(Router);

  @ViewChild('playlistContainer') playlistContainer?: ElementRef<HTMLDivElement>;

  showQueue = false;
  history: AudioTrack[] = [];
  /** Reverse-ordered history for display (oldest first). Recomputed on every history mutation. */
  historyReversed: AudioTrack[] = [];
  /**
   * Pre-computed icon for the current track. Computed signal so it re-runs
   * when the audio service track signal changes.
   */
  readonly typeIcon = computed(() => {
    const track = this.audioService.track();
    return track?.type === 'pulse' ? 'vital_signs' : 'podcasts';
  });
  /** Pre-formatted current-time / duration strings. */
  readonly currentTimeText = computed(() => this.audioService.formatTime(this.audioService.currentTime()));
  readonly durationText = computed(() => this.audioService.formatTime(this.audioService.duration()));
  private previousTrackForHistory: AudioTrack | null = null;
  private shouldScrollToBottom = false;
  private skipNextHistoryUpdate = false; // Flag to prevent effect from re-adding track when playing from history

  constructor() {
    this.loadHistory();

    // Track history when track changes
    effect(() => {
      const currentTrack = this.audioService.track();
      if (this.skipNextHistoryUpdate) {
        // Reset flag and update previous track without adding to history
        this.skipNextHistoryUpdate = false;
        this.previousTrackForHistory = currentTrack;
        return;
      }
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

  seekByStep(stepPercent: number): void {
    const current = this.audioService.progress();
    this.audioService.seekToPercent(Math.max(0, Math.min(100, current + stepPercent)));
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
    if (this.showQueue) {
      this.shouldScrollToBottom = true;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom && this.playlistContainer) {
      this.scrollPlaylistToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  private scrollPlaylistToBottom(): void {
    if (this.playlistContainer) {
      const container = this.playlistContainer.nativeElement;
      container.scrollTop = container.scrollHeight;
    }
  }

  nextTrack(): void {
    this.audioService.playNext();
  }

  previousTrack(): void {
    if (this.history.length > 0) {
      const lastTrack = this.history[0];
      // Remove from history and play
      this.setHistory(this.history.slice(1));
      this.saveHistory();
      this.audioService.play(lastTrack);
    }
  }

  get hasPreviousTrack(): boolean {
    return this.history.length > 0;
  }

  /**
   * Play a track from the queue, adding skipped tracks to history.
   * When user clicks a queue item that's not the next one:
   * 1. The current track goes to history
   * 2. Any skipped tracks (between current and clicked) go to history
   * 3. The clicked track starts playing
   */
  playFromQueue(trackId: string): void {
    const queue = this.audioService.queue();
    const clickedIndex = queue.findIndex((t) => t.id === trackId);
    if (clickedIndex === -1) return;

    // Get the current track to add to history
    const currentTrack = this.audioService.track();

    // Get tracks that will be skipped (tracks before the clicked one in queue)
    const skippedTracks = queue.slice(0, clickedIndex);

    // Add current track to history first (it's the most recently played)
    if (currentTrack) {
      this.addToHistory(currentTrack);
    }

    // Add skipped tracks to history in order (oldest skipped first = lowest index)
    // We add them one by one so they're in the right order in history
    for (const track of skippedTracks) {
      this.addToHistory(track);
    }

    // Skip the history update from the effect since we've handled it
    this.skipNextHistoryUpdate = true;

    // Now skip to the track
    this.audioService.skipToTrack(trackId);
  }

  removeFromQueue(event: Event, trackId: string): void {
    event.stopPropagation();
    this.audioService.removeFromQueue(trackId);
  }

  /**
   * Play a track from history, properly restoring the play order.
   * When user clicks a history item:
   * 1. All tracks after it (more recently played) go to the front of the queue
   * 2. The current track also goes to the front of the queue
   * 3. The clicked track becomes the current track
   * This way, if user plays through, they'll hear everything they missed in order.
   */
  playFromHistory(track: AudioTrack): void {
    // Find the index of the clicked track in history
    // History is stored with most recent at index 0
    const clickedIndex = this.history.findIndex((t) => t.id === track.id);
    if (clickedIndex === -1) return;

    // Get all tracks that were played AFTER the clicked track (more recent = lower index)
    // These need to go back into the queue so user hears them again
    const tracksToRequeue = this.history.slice(0, clickedIndex);

    // Get the currently playing track (if any) - it also goes to the queue
    const currentTrack = this.audioService.track();

    // Build the new queue: [more recent history items] + [current track] + [existing queue]
    const existingQueue = this.audioService.queue();
    const newQueueItems: AudioTrack[] = [];

    // Add history items that were played after clicked track (in reverse order so oldest plays first)
    // tracksToRequeue is [most recent, ..., least recent], we want [least recent, ..., most recent]
    for (let i = tracksToRequeue.length - 1; i >= 0; i--) {
      const historyTrack = tracksToRequeue[i];
      // Don't add duplicates
      if (!newQueueItems.some((t) => t.id === historyTrack.id)) {
        newQueueItems.push(historyTrack);
      }
    }

    // Add current track if it exists and isn't already queued
    if (currentTrack && !newQueueItems.some((t) => t.id === currentTrack.id)) {
      newQueueItems.push(currentTrack);
    }

    // Add existing queue items that aren't duplicates
    for (const queueTrack of existingQueue) {
      if (!newQueueItems.some((t) => t.id === queueTrack.id)) {
        newQueueItems.push(queueTrack);
      }
    }

    // Update the queue with the new order
    this.audioService.setQueue(newQueueItems);

    // Remove the clicked track and all tracks before it (more recent) from history
    // Keep only the tracks that were played before the clicked track (older)
    this.setHistory(this.history.slice(clickedIndex + 1));
    this.saveHistory();

    // Skip the next history update from the effect - we've already handled the history
    this.skipNextHistoryUpdate = true;

    // Play the clicked track
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
    this.setHistory(this.history.filter((t) => t.id !== trackId));
    this.saveHistory();
  }

  // Clear both history and queue
  clearAll(): void {
    this.setHistory([]);
    this.saveHistory();
    this.audioService.clearQueue();
  }

  /** Set `history` and refresh the reversed-for-display cache atomically. */
  private setHistory(next: AudioTrack[]): void {
    this.history = next;
    this.historyReversed = [...next].reverse();
  }

  // History Management
  private addToHistory(track: AudioTrack): void {
    // Remove if already in history
    let next = this.history.filter((t) => t.id !== track.id);
    // Add to front
    next = [track, ...next];
    // Limit size
    if (next.length > MAX_HISTORY_SIZE) {
      next = next.slice(0, MAX_HISTORY_SIZE);
    }
    this.setHistory(next);
    this.saveHistory();
  }

  clearHistory(): void {
    this.setHistory([]);
    this.saveHistory();
  }

  private loadHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        this.setHistory(JSON.parse(stored));
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
