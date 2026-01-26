// Copyright (c) 2026 Perpetuator LLC
import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Voice, VoicesService, VoiceTier, voiceToTier, tierToString } from '../../podcast/voices.service';

/**
 * Shared voice selector component for podcasts and pulses.
 * Features:
 * - Tier filtering with toggle buttons (all selected by default)
 * - Search by voice name
 * - Grouped by tier with section headers
 * - Preview on hover
 * - Single or multi-select mode
 */
@Component({
  selector: 'app-voice-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatButtonToggleModule,
  ],
  templateUrl: './voice-selector.component.html',
  styleUrl: './voice-selector.component.scss',
})
export class VoiceSelectorComponent implements OnInit, OnDestroy {
  @ViewChild('audioPlayer') audioPlayer!: ElementRef<HTMLAudioElement>;

  /** Currently selected voice UUID (single-select mode) */
  @Input() selectedVoiceUuid: string | null = null;

  /** Multiple selected voice UUIDs (multi-select mode) */
  @Input() selectedVoiceUuids: string[] = [];

  /** Whether to allow multi-select (for podcasts) */
  @Input() multiSelect = false;

  /** Loading state */
  @Input() loading = false;

  /** Emitted when a voice is selected (single-select mode) */
  @Output() voiceSelected = new EventEmitter<Voice>();

  /** Emitted when voices are toggled (multi-select mode) */
  @Output() voicesChanged = new EventEmitter<Voice[]>();

  private subscriptions = new Subscription();

  // Voice data
  voices: Voice[] = [];
  filteredVoices: Voice[] = [];
  loadingVoices = false;

  // Tier filtering
  allTiers: VoiceTier[] = [
    VoiceTier.PREMIUM_HD,
    VoiceTier.PREMIUM,
    VoiceTier.REGULAR_HD,
    VoiceTier.REGULAR,
    VoiceTier.REGULAR_LD,
  ];
  selectedTiers = new Set<VoiceTier>(this.allTiers);

  // Search
  searchControl = new FormControl('');

  // Preview
  currentPlayingVoice: Voice | null = null;

  constructor(private voicesService: VoicesService) {}

  ngOnInit(): void {
    this.loadVoices();
    this.setupSearch();
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
          this.voices = response.voices;
          this.applyFilters();
          this.loadingVoices = false;
        },
        error: () => {
          this.loadingVoices = false;
        },
      }),
    );
  }

  private setupSearch(): void {
    this.subscriptions.add(
      this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(() => {
        this.applyFilters();
      }),
    );
  }

  applyFilters(): void {
    const searchTerm = (this.searchControl.value || '').toLowerCase();

    this.filteredVoices = this.voices.filter((voice) => {
      // Tier filter
      const tier = voiceToTier(voice);
      if (!this.selectedTiers.has(tier)) {
        return false;
      }

      // Search filter
      const name = (voice.displayName || voice.externalId || '').toLowerCase();
      return name.includes(searchTerm);
    });

    // Sort by tier order then by name
    this.filteredVoices.sort((a, b) => {
      const tierOrder = this.allTiers.indexOf(voiceToTier(a)) - this.allTiers.indexOf(voiceToTier(b));
      if (tierOrder !== 0) return tierOrder;
      return this.getVoiceDisplayName(a).localeCompare(this.getVoiceDisplayName(b));
    });
  }

  toggleTier(tier: VoiceTier): void {
    if (this.selectedTiers.has(tier)) {
      // Don't allow deselecting all tiers
      if (this.selectedTiers.size > 1) {
        this.selectedTiers.delete(tier);
      }
    } else {
      this.selectedTiers.add(tier);
    }
    this.applyFilters();
  }

  isTierSelected(tier: VoiceTier): boolean {
    return this.selectedTiers.has(tier);
  }

  selectAllTiers(): void {
    this.selectedTiers = new Set(this.allTiers);
    this.applyFilters();
  }

  // Get voices grouped by tier for display
  getVoicesGroupedByTier(): { tier: VoiceTier; label: string; voices: Voice[] }[] {
    const groups: { tier: VoiceTier; label: string; voices: Voice[] }[] = [];

    for (const tier of this.allTiers) {
      if (!this.selectedTiers.has(tier)) continue;

      const voicesInTier = this.filteredVoices.filter((v) => voiceToTier(v) === tier);
      if (voicesInTier.length > 0) {
        groups.push({
          tier,
          label: tierToString(tier),
          voices: voicesInTier,
        });
      }
    }

    return groups;
  }

  // Selection methods
  isVoiceSelected(voice: Voice): boolean {
    if (this.multiSelect) {
      return this.selectedVoiceUuids.includes(voice.uuid);
    }
    return this.selectedVoiceUuid === voice.uuid;
  }

  selectVoice(voice: Voice): void {
    if (this.multiSelect) {
      // Toggle selection
      const index = this.selectedVoiceUuids.indexOf(voice.uuid);
      if (index >= 0) {
        this.selectedVoiceUuids.splice(index, 1);
      } else {
        this.selectedVoiceUuids.push(voice.uuid);
      }
      const selectedVoices = this.voices.filter((v) => this.selectedVoiceUuids.includes(v.uuid));
      this.voicesChanged.emit(selectedVoices);
    } else {
      this.selectedVoiceUuid = voice.uuid;
      this.voiceSelected.emit(voice);
    }
  }

  // Display helpers
  getVoiceDisplayName(voice: Voice): string {
    return voice.displayName || voice.externalId || 'Unknown Voice';
  }

  getTierLabel(tier: VoiceTier): string {
    return tierToString(tier);
  }

  getTierIcon(tier: VoiceTier): string {
    switch (tier) {
      case VoiceTier.PREMIUM_HD:
        return 'stars';
      case VoiceTier.PREMIUM:
        return 'star';
      case VoiceTier.REGULAR_HD:
        return 'hd';
      case VoiceTier.REGULAR:
        return 'record_voice_over';
      case VoiceTier.REGULAR_LD:
        return 'mic';
      default:
        return 'mic';
    }
  }

  getVoiceWpm(voice: Voice): number | null {
    return voice.wordsPerMinute || null;
  }

  /**
   * Get cost per word for a voice.
   * Uses backend-provided creditsPerWord field (preferred) or calculates from creditsPerMillionChar.
   */
  getCreditsPerWord(voice: Voice): number | null {
    // Prefer backend-calculated value
    if (voice.creditsPerWord != null) {
      return voice.creditsPerWord;
    }
    // Fallback calculation (deprecated - backend should provide this)
    if (!voice.creditsPerMillionChar) return null;
    const charsPerWord = 5; // Must match backend AVERAGE_CHARS_PER_WORD
    return (voice.creditsPerMillionChar * charsPerWord) / 1_000_000;
  }

  /**
   * Format credits per word for display (e.g., "0.0025 credits/word")
   */
  formatCreditsPerWord(voice: Voice): string | null {
    const cpw = this.getCreditsPerWord(voice);
    if (cpw === null) return null;
    // Format as credits per 1000 words for readability
    const per1k = cpw * 1000;
    return `${per1k.toFixed(2)} credits/1k words`;
  }

  // Preview methods
  playPreview(voice: Voice, event: MouseEvent): void {
    event.stopPropagation();
    if (!voice.sampleUrl || !this.audioPlayer) return;

    this.currentPlayingVoice = voice;
    this.audioPlayer.nativeElement.src = voice.sampleUrl;
    this.audioPlayer.nativeElement.play().catch(() => {
      this.currentPlayingVoice = null;
    });
  }

  stopPreview(): void {
    if (this.audioPlayer?.nativeElement) {
      this.audioPlayer.nativeElement.pause();
      this.audioPlayer.nativeElement.currentTime = 0;
    }
    this.currentPlayingVoice = null;
  }
}
