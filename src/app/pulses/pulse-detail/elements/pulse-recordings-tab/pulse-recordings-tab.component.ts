// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Pulse } from '../../../pulses.types';
import { formatSeconds } from '../../../pulse-status.utils';
import { PulseStatusClassPipe } from '../../pipes/pulse-status-class.pipe';
import { PulseStatusTextPipe } from '../../pipes/pulse-status-text.pipe';
import { PulseTimeAgoPipe } from '../../pipes/pulse-time-ago.pipe';

@Component({
  selector: 'app-pulse-recordings-tab',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    PulseStatusClassPipe,
    PulseStatusTextPipe,
    PulseTimeAgoPipe,
  ],
  templateUrl: './pulse-recordings-tab.component.html',
  styleUrl: './pulse-recordings-tab.component.scss',
})
export class PulseRecordingsTabComponent {
  private _pulses: Pulse[] = [];
  @Input() set pulses(value: Pulse[]) {
    this._pulses = value || [];
    this.rebuildHistory();
  }
  get pulses(): Pulse[] {
    return this._pulses;
  }

  @Output() createRecording = new EventEmitter<void>();
  @Output() viewRecording = new EventEmitter<Pulse>();
  @Output() playPulse = new EventEmitter<Pulse>();
  @Output() queueNext = new EventEmitter<Pulse>();
  @Output() queue = new EventEmitter<Pulse>();

  /**
   * V3: latest is shown in the hero above — history list excludes it.
   * Each entry is enriched with the per-row expand state and pre-built
   * display strings/arrays. These pre-computed fields keep the template's
   * cyclomatic complexity below the 10-branch lint limit by collapsing
   * `@if` / `@else` pairs and `&&` chains.
   */
  historyRecordings: (Pulse & {
    expanded: boolean;
    expandIcon: 'expand_less' | 'expand_more';
    expandTooltip: 'Collapse' | 'Expand';
    sourceItems: { label: string; chipClass: string }[];
    metaParts: string[];
    validationRows: { label: string; pass: boolean; icon: 'check' | 'remove'; value: 'Pass' | 'N/A' }[];
    transcriptText: string;
    transcriptClass: string;
    canPlay: boolean;
    playDurationText: string;
    placeholderIcon: 'error' | 'hourglass_empty';
    placeholderTooltip: string;
    placeholderDurationText: string;
    wordCountText: string;
  })[] = [];

  /** Description shown above the history list, pre-computed to avoid an @if branch. */
  get historyDescription(): string {
    return this.historyRecordings.length > 0
      ? 'Previous recordings from this pulse.'
      : 'Each recording is a generated audio file. Auto-generated from your content sources, or create your own.';
  }

  // Per-row expand state, keyed by pulse uuid.
  private readonly expandedRows = new Set<string>();

  private rebuildHistory(): void {
    const tail = this._pulses.length > 1 ? this._pulses.slice(1) : [];
    this.historyRecordings = tail.map((pulse) => {
      const expanded = this.expandedRows.has(pulse.uuid);
      const news = pulse.news ?? [];
      const urls = pulse.researchUrls ?? [];
      const topNewsBase = news.slice(0, 6).map((n) => ({
        label: this.getNewsSourceLabel(n),
        chipClass: 'history-source-chip',
      }));
      const extraNewsCount = Math.max(0, news.length - 6);
      const sourceItems: { label: string; chipClass: string }[] = [...topNewsBase];
      if (extraNewsCount > 0) {
        sourceItems.push({ label: `+${extraNewsCount} more`, chipClass: 'history-source-chip more' });
      }
      if (sourceItems.length === 0) {
        sourceItems.push({ label: 'No sources recorded.', chipClass: 'history-detail-empty' });
      }
      const metaParts: string[] = [];
      if (news.length > 0) metaParts.push(`${news.length} news`);
      if (urls.length > 0) metaParts.push(`${urls.length} URLs`);
      const transcript = pulse.transcript ?? '';
      const transcriptTruncated = transcript.length > 240;
      const hasTranscript = !!pulse.transcript;
      const canPlay = Boolean(pulse.audioUrl && (pulse.status === 'READY' || pulse.status === 'DELIVERED'));
      const failed = pulse.status === 'FAILED';
      const formattedDuration = formatSeconds(pulse.audioDurationSeconds);
      return {
        ...pulse,
        expanded,
        expandIcon: expanded ? 'expand_less' : 'expand_more',
        expandTooltip: expanded ? 'Collapse' : 'Expand',
        sourceItems,
        metaParts,
        validationRows: [
          {
            label: 'Compliance',
            pass: !!pulse.validatedCompliance,
            icon: pulse.validatedCompliance ? 'check' : 'remove',
            value: pulse.validatedCompliance ? 'Pass' : 'N/A',
          },
          {
            label: 'Facts',
            pass: !!pulse.validatedFacts,
            icon: pulse.validatedFacts ? 'check' : 'remove',
            value: pulse.validatedFacts ? 'Pass' : 'N/A',
          },
          {
            label: 'Length',
            pass: !!pulse.validatedLength,
            icon: pulse.validatedLength ? 'check' : 'remove',
            value: pulse.validatedLength ? 'Pass' : 'N/A',
          },
        ],
        transcriptText: hasTranscript
          ? transcriptTruncated
            ? transcript.slice(0, 240) + '…'
            : transcript
          : 'No transcript available.',
        transcriptClass: hasTranscript ? '' : 'history-detail-empty',
        canPlay,
        playDurationText: formattedDuration,
        placeholderIcon: failed ? 'error' : 'hourglass_empty',
        placeholderTooltip: failed ? pulse.errorMessage || 'Failed' : 'Not ready',
        placeholderDurationText: formattedDuration || '—',
        wordCountText: `${pulse.wordCount || 0} words`,
      };
    });
  }

  isExpanded(uuid: string): boolean {
    return this.expandedRows.has(uuid);
  }

  toggleExpanded(uuid: string): void {
    if (this.expandedRows.has(uuid)) {
      this.expandedRows.delete(uuid);
    } else {
      this.expandedRows.add(uuid);
    }
    this.rebuildHistory();
  }

  emitCardAction(event: MouseEvent, emitter: EventEmitter<Pulse>, pulse: Pulse): void {
    event.stopPropagation();
    emitter.emit(pulse);
  }

  openRecordingFromKeyboard(event: Event, pulse: Pulse): void {
    event.preventDefault();
    this.viewRecording.emit(pulse);
  }

  getNewsSourceLabel(news: { source?: string; url?: string; title?: string }): string {
    if (news?.source) return news.source;
    if (news?.url) {
      try {
        return new URL(news.url).hostname.replace(/^www\./, '');
      } catch {
        return news.url;
      }
    }
    return news?.title ?? 'Source';
  }
}
