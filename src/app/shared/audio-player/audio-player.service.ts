// Copyright (c) 2026 Perpetuator LLC
import { Injectable, signal, computed } from '@angular/core';

export interface AudioTrack {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  duration?: number; // seconds
  type: 'pulse' | 'episode';
  sourceRoute?: string; // route to navigate to when clicking track info
}

export interface AudioPlayerState {
  track: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  error: string | null;
}

const QUEUE_STORAGE_KEY = 'audio-player-queue';
const VOLUME_STORAGE_KEY = 'audio-player-volume';

/**
 * Persistent audio player service that maintains audio playback state
 * across page navigation. Uses signals for reactive state management.
 * Supports queue with localStorage persistence.
 */
@Injectable({
  providedIn: 'root',
})
export class AudioPlayerService {
  private audio: HTMLAudioElement | null = null;

  // State signals
  private readonly _track = signal<AudioTrack | null>(null);
  private readonly _isPlaying = signal(false);
  private readonly _currentTime = signal(0);
  private readonly _duration = signal(0);
  private readonly _volume = signal(1);
  private readonly _isMuted = signal(false);
  private readonly _isLoading = signal(false);
  private readonly _error = signal<string | null>(null);

  // Queue signals
  private readonly _queue = signal<AudioTrack[]>([]);
  private readonly _autoQueueEnabled = signal(false);

  // Public readonly signals
  readonly track = this._track.asReadonly();
  readonly isPlaying = this._isPlaying.asReadonly();
  readonly currentTime = this._currentTime.asReadonly();
  readonly duration = this._duration.asReadonly();
  readonly volume = this._volume.asReadonly();
  readonly isMuted = this._isMuted.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly queue = this._queue.asReadonly();
  readonly autoQueueEnabled = this._autoQueueEnabled.asReadonly();

  // Computed signals
  readonly hasTrack = computed(() => this._track() !== null);
  readonly hasQueue = computed(() => this._queue().length > 0);
  readonly queueLength = computed(() => this._queue().length);
  readonly progress = computed(() => {
    const duration = this._duration();
    const currentTime = this._currentTime();
    return duration > 0 ? (currentTime / duration) * 100 : 0;
  });
  readonly remainingTime = computed(() => {
    return Math.max(0, this._duration() - this._currentTime());
  });

  constructor() {
    this.loadQueueFromStorage();
    this.loadVolumeFromStorage();
    this.initAudio();
  }

  private loadQueueFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const queue = JSON.parse(stored) as AudioTrack[];
        this._queue.set(queue);
      }
    } catch (e) {
      console.warn('[AudioPlayer] Failed to load queue from storage:', e);
    }
  }

  private saveQueueToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this._queue()));
    } catch (e) {
      console.warn('[AudioPlayer] Failed to save queue to storage:', e);
    }
  }

  private loadVolumeFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
      if (stored) {
        this._volume.set(parseFloat(stored));
      }
    } catch (e) {
      console.warn('[AudioPlayer] Failed to load volume from storage:', e);
    }
  }

  private saveVolumeToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, this._volume().toString());
    } catch (e) {
      console.warn('[AudioPlayer] Failed to save volume to storage:', e);
    }
  }

  private initAudio(): void {
    if (typeof window === 'undefined') return; // SSR check

    this.audio = new Audio();
    this.audio.preload = 'metadata';

    // Event listeners
    this.audio.addEventListener('loadstart', () => {
      this._isLoading.set(true);
      this._error.set(null);
    });

    this.audio.addEventListener('canplay', () => {
      this._isLoading.set(false);
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this._duration.set(this.audio?.duration || 0);
    });

    this.audio.addEventListener('timeupdate', () => {
      this._currentTime.set(this.audio?.currentTime || 0);
    });

    this.audio.addEventListener('play', () => {
      this._isPlaying.set(true);
    });

    this.audio.addEventListener('pause', () => {
      this._isPlaying.set(false);
    });

    this.audio.addEventListener('ended', () => {
      this._isPlaying.set(false);
      this._currentTime.set(0);
      // Auto-play next track in queue
      this.playNext();
    });

    this.audio.addEventListener('error', () => {
      this._isLoading.set(false);
      this._isPlaying.set(false);
      this._error.set('Failed to load audio');
    });

    this.audio.addEventListener('volumechange', () => {
      this._volume.set(this.audio?.volume || 1);
      this._isMuted.set(this.audio?.muted || false);
    });
  }

  /**
   * Play a new track
   */
  play(track: AudioTrack): void {
    if (!this.audio) return;

    // If same track, just resume
    if (this._track()?.id === track.id && this._track()?.audioUrl === track.audioUrl) {
      this.audio.play().catch((err) => {
        console.error('[AudioPlayer] Play error:', err);
        this._error.set('Failed to play audio');
      });
      return;
    }

    // New track
    this._track.set(track);
    this._currentTime.set(0);
    this._duration.set(track.duration || 0);
    this._isLoading.set(true);

    this.audio.src = track.audioUrl;
    this.audio.load();
    this.audio.play().catch((err) => {
      console.error('[AudioPlayer] Play error:', err);
      this._error.set('Failed to play audio');
    });
  }

  /**
   * Toggle play/pause
   */
  togglePlay(): void {
    if (!this.audio || !this._track()) return;

    if (this._isPlaying()) {
      this.audio.pause();
    } else {
      this.audio.play().catch((err) => {
        console.error('[AudioPlayer] Play error:', err);
        this._error.set('Failed to play audio');
      });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.audio) return;
    this.audio.pause();
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (!this.audio || !this._track()) return;
    this.audio.play().catch((err) => {
      console.error('[AudioPlayer] Play error:', err);
      this._error.set('Failed to play audio');
    });
  }

  /**
   * Stop playback and clear track
   */
  stop(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.currentTime = 0;
    this._track.set(null);
    this._currentTime.set(0);
    this._duration.set(0);
    this._isPlaying.set(false);
  }

  /**
   * Seek to a specific time (in seconds)
   */
  seek(time: number): void {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, Math.min(time, this._duration()));
  }

  /**
   * Seek by percentage (0-100)
   */
  seekToPercent(percent: number): void {
    const time = (percent / 100) * this._duration();
    this.seek(time);
  }

  /**
   * Skip forward by seconds
   */
  skipForward(seconds = 15): void {
    this.seek(this._currentTime() + seconds);
  }

  /**
   * Skip backward by seconds
   */
  skipBackward(seconds = 15): void {
    this.seek(this._currentTime() - seconds);
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number): void {
    if (!this.audio) return;
    this.audio.volume = Math.max(0, Math.min(1, volume));
    this.saveVolumeToStorage();
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    if (!this.audio) return;
    this.audio.muted = !this.audio.muted;
  }

  /**
   * Format seconds to MM:SS or HH:MM:SS
   */
  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  // ==================== QUEUE MANAGEMENT ====================

  /**
   * Add track to end of queue
   */
  addToQueue(track: AudioTrack): void {
    // Don't add duplicates
    if (this._queue().some((t) => t.id === track.id)) {
      return;
    }
    this._queue.update((q) => [...q, track]);
    this.saveQueueToStorage();
  }

  /**
   * Add track to play next (after current track)
   */
  playNext(track?: AudioTrack): void {
    if (track) {
      // Remove if already in queue to avoid duplicates
      this._queue.update((q) => q.filter((t) => t.id !== track.id));
      // Add to front of queue
      this._queue.update((q) => [track, ...q]);
      this.saveQueueToStorage();
    } else {
      // No track provided - play next from queue
      const queue = this._queue();
      if (queue.length > 0) {
        const nextTrack = queue[0];
        this._queue.update((q) => q.slice(1));
        this.saveQueueToStorage();
        this.play(nextTrack);
      }
      // TODO: If auto-queue enabled and queue empty, fetch from backend
    }
  }

  /**
   * Remove track from queue by id
   */
  removeFromQueue(trackId: string): void {
    this._queue.update((q) => q.filter((t) => t.id !== trackId));
    this.saveQueueToStorage();
  }

  /**
   * Clear the entire queue
   */
  clearQueue(): void {
    this._queue.set([]);
    this.saveQueueToStorage();
  }

  /**
   * Move track in queue (reorder)
   */
  reorderQueue(fromIndex: number, toIndex: number): void {
    const queue = [...this._queue()];
    const [moved] = queue.splice(fromIndex, 1);
    queue.splice(toIndex, 0, moved);
    this._queue.set(queue);
    this.saveQueueToStorage();
  }

  /**
   * Skip to a specific track in queue (plays it and removes from queue)
   */
  skipToTrack(trackId: string): void {
    const queue = this._queue();
    const index = queue.findIndex((t) => t.id === trackId);
    if (index >= 0) {
      const track = queue[index];
      // Remove this track and all before it from queue
      this._queue.update((q) => q.slice(index + 1));
      this.saveQueueToStorage();
      this.play(track);
    }
  }

  /**
   * Toggle auto-queue feature
   */
  toggleAutoQueue(): void {
    this._autoQueueEnabled.update((v) => !v);
  }

  /**
   * Set auto-queue enabled state
   */
  setAutoQueue(enabled: boolean): void {
    this._autoQueueEnabled.set(enabled);
  }
}
