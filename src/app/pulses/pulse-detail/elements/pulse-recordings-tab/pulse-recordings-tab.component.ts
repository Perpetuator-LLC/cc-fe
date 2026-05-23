// Copyright (c) 2026 Perpetuator LLC
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Pulse } from '../../../pulses.types';
import { PulseCanPlayPipe } from '../../pipes/pulse-can-play.pipe';
import { PulseFormatSecondsPipe } from '../../pipes/pulse-format-seconds.pipe';
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
    PulseCanPlayPipe,
    PulseFormatSecondsPipe,
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
   * `topNews` source labels so the template avoids method calls per CD tick.
   */
  historyRecordings: (Pulse & {
    expanded: boolean;
    expandIcon: 'expand_less' | 'expand_more';
    expandTooltip: 'Collapse' | 'Expand';
    topNews: { source: string }[];
    extraNewsCount: number;
  })[] = [];

  // Per-row expand state, keyed by pulse uuid.
  private readonly expandedRows = new Set<string>();

  private rebuildHistory(): void {
    const tail = this._pulses.length > 1 ? this._pulses.slice(1) : [];
    this.historyRecordings = tail.map((pulse) => {
      const expanded = this.expandedRows.has(pulse.uuid);
      const news = pulse.news ?? [];
      return {
        ...pulse,
        expanded,
        expandIcon: expanded ? 'expand_less' : 'expand_more',
        expandTooltip: expanded ? 'Collapse' : 'Expand',
        topNews: news.slice(0, 6).map((n) => ({ source: this.getNewsSourceLabel(n) })),
        extraNewsCount: Math.max(0, news.length - 6),
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
