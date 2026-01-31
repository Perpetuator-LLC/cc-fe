// Copyright (c) 2026 Perpetuator LLC
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AudioPlayerService, AudioTrack } from '../audio-player/audio-player.service';

/**
 * Shared component for media playback actions.
 * Use this component consistently across episodes, pulses, and other audio content.
 *
 * Features:
 * - Play button that starts playback in the shared audio player
 * - Context menu with "Play Next" and "Add to Queue" options
 *
 * Usage:
 * <app-media-actions
 *   [track]="audioTrack"
 *   [showLabel]="true"
 *   (played)="onPlay()">
 * </app-media-actions>
 */
@Component({
  selector: 'app-media-actions',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatMenuModule, MatTooltipModule],
  templateUrl: './media-actions.component.html',
  styleUrl: './media-actions.component.scss',
})
export class MediaActionsComponent {
  /** The audio track to play */
  @Input({ required: true }) track!: AudioTrack;

  /** Whether to show "Play" label on the button */
  @Input() showLabel = true;

  /** Button appearance: 'flat' | 'stroked' | 'icon' */
  @Input() appearance: 'flat' | 'stroked' | 'icon' = 'flat';

  /** Button color (for mat-flat-button) */
  @Input() color: 'primary' | 'accent' | 'warn' | undefined = 'primary';

  /** Emitted when play is triggered */
  @Output() played = new EventEmitter<AudioTrack>();

  constructor(private audioPlayerService: AudioPlayerService) {}

  get isCurrentTrack(): boolean {
    const current = this.audioPlayerService.track();
    return current?.id === this.track?.id;
  }

  get isPlaying(): boolean {
    return this.isCurrentTrack && this.audioPlayerService.isPlaying();
  }

  playNow(): void {
    if (!this.track?.audioUrl) return;
    this.audioPlayerService.play(this.track);
    this.played.emit(this.track);
  }

  togglePlay(): void {
    if (this.isCurrentTrack) {
      this.audioPlayerService.togglePlay();
    } else {
      this.playNow();
    }
  }

  playNext(): void {
    if (!this.track?.audioUrl) return;
    this.audioPlayerService.playNext(this.track);
  }

  addToQueue(): void {
    if (!this.track?.audioUrl) return;
    this.audioPlayerService.addToQueue(this.track);
  }
}
