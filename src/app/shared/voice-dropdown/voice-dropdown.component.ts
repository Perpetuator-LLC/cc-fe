// Copyright (c) 2026 Perpetuator LLC
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { Voice, VoicesService, VoiceTier, voiceToTier, tierToString } from '../../podcast/voices.service';

/**
 * Compact voice dropdown with play preview button.
 * Use this in dialogs where space is limited but voice preview is needed.
 */
@Component({
  selector: 'app-voice-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './voice-dropdown.component.html',
  styleUrl: './voice-dropdown.component.scss',
})
export class VoiceDropdownComponent implements OnInit, OnDestroy {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  /** Currently selected voice UUID */
  @Input() selectedVoiceUuid: string | null = null;

  /** Optional label override */
  @Input() label = 'Voice';

  /** Optional hint text */
  @Input() hint = 'Select a voice for text-to-speech';

  /** Emitted when a voice is selected */
  @Output() voiceSelected = new EventEmitter<Voice>();

  private readonly voicesService = inject(VoicesService);
  private subscriptions = new Subscription();

  /** Voices enriched with pre-computed display name + tier label per row. */
  voices: (Voice & { displayLabel: string; tierLabel: string })[] = [];
  loadingVoices = false;
  playingVoiceUuid: string | null = null;
  /** Display name of the currently selected voice. */
  selectedVoiceName = '';

  ngOnInit(): void {
    this.loadVoices();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopPreview();
  }

  private loadVoices(): void {
    this.loadingVoices = true;
    this.subscriptions.add(
      this.voicesService.getVoices(undefined, true).subscribe({
        next: (response) => {
          // Sort by tier then name (Regular HD first)
          const sorted = [...response.voices].sort((a, b) => {
            const tierOrder = this.getTierOrder(voiceToTier(a)) - this.getTierOrder(voiceToTier(b));
            if (tierOrder !== 0) return tierOrder;
            return this.getDisplayName(a).localeCompare(this.getDisplayName(b));
          });
          this.voices = sorted.map((v) => ({
            ...v,
            displayLabel: this.getDisplayName(v),
            tierLabel: this.getTierLabel(v),
          }));
          this.loadingVoices = false;

          // Auto-select first voice if none is selected
          if (!this.selectedVoiceUuid && this.voices.length > 0) {
            this.selectedVoiceUuid = this.voices[0].uuid;
            this.voiceSelected.emit(this.voices[0]);
          }
          this.refreshSelectedVoiceName();
        },
        error: () => {
          this.loadingVoices = false;
        },
      }),
    );
  }

  private getTierOrder(tier: VoiceTier): number {
    const order: VoiceTier[] = [
      VoiceTier.REGULAR_HD,
      VoiceTier.REGULAR,
      VoiceTier.REGULAR_LD,
      VoiceTier.PREMIUM,
      VoiceTier.PREMIUM_HD,
    ];
    return order.indexOf(tier);
  }

  onSelectionChange(voiceUuid: string): void {
    const voice = this.voices.find((v) => v.uuid === voiceUuid);
    if (voice) {
      this.selectedVoiceUuid = voiceUuid;
      this.refreshSelectedVoiceName();
      this.voiceSelected.emit(voice);
    }
  }

  private refreshSelectedVoiceName(): void {
    const voice = this.voices.find((v) => v.uuid === this.selectedVoiceUuid);
    this.selectedVoiceName = voice?.displayLabel ?? '';
  }

  getDisplayName(voice: Voice): string {
    return voice.displayName || voice.externalId || 'Unknown';
  }

  getSelectedVoiceName(): string {
    if (!this.selectedVoiceUuid) return '';
    const voice = this.voices.find((v) => v.uuid === this.selectedVoiceUuid);
    return voice ? this.getDisplayName(voice) : '';
  }

  getTierLabel(voice: Voice): string {
    return tierToString(voiceToTier(voice));
  }

  playPreviewOnHover(voice: Voice): void {
    if (!voice.sampleUrl) return;

    this.playingVoiceUuid = voice.uuid;
    if (this.audioPlayer?.nativeElement) {
      this.audioPlayer.nativeElement.src = voice.sampleUrl;
      this.audioPlayer.nativeElement.play().catch(() => {
        this.playingVoiceUuid = null;
      });
    }
  }

  stopPreview(): void {
    if (this.audioPlayer?.nativeElement) {
      this.audioPlayer.nativeElement.pause();
      this.audioPlayer.nativeElement.currentTime = 0;
    }
    this.playingVoiceUuid = null;
  }

  onAudioEnded(): void {
    this.playingVoiceUuid = null;
  }

  isPlaying(voice: Voice): boolean {
    return this.playingVoiceUuid === voice.uuid;
  }
}
