// Copyright (c) 2026 Perpetuator LLC
import { Component, LOCALE_ID, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, formatDate } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { Pulse } from '../pulses.types';
import { AudioPlayerService, AudioTrack } from '../../shared/audio-player/audio-player.service';
import { AgentActionsListComponent } from '../../shared/agent-actions-list/agent-actions-list.component';
import { ResearchNewsListComponent } from '../../shared/research-news-list/research-news-list.component';
import { ResearchUrlsListComponent } from '../../shared/research-urls-list/research-urls-list.component';
import { PageTitleService } from '../../layout/page-title.service';
import {
  getStatusClass as pulseStatusClass,
  getDisplayStatusText as pulseDisplayText,
  formatSeconds as pulseFormatSeconds,
} from '../pulse-status.utils';

@Component({
  selector: 'app-recording-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatTooltipModule,
    MatMenuModule,
    AgentActionsListComponent,
    ResearchNewsListComponent,
    ResearchUrlsListComponent,
  ],
  templateUrl: './recording-detail.component.html',
  styleUrl: './recording-detail.component.scss',
})
export class RecordingDetailComponent implements OnInit, OnDestroy {
  // Dependencies
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly messageService = inject(MessageService);
  private readonly pulsesService = inject(PulsesService);
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly locale = inject(LOCALE_ID);

  private subscriptions = new Subscription();
  protected loading = true;
  protected recordingUuid: string;
  protected pulseConfigUuid: string | null = null;

  recording: Pulse | null = null;
  /** Pre-computed display strings for the loaded recording. */
  recordingDisplay: {
    statusClass: string;
    statusText: string;
    formattedDuration: string;
  } | null = null;

  private rebuildRecordingDisplay(): void {
    this.recordingDisplay = this.recording
      ? {
          statusClass: this.getStatusClass(this.recording.status),
          statusText: this.getDisplayStatusText(),
          formattedDuration: this.formatSeconds(this.recording.audioDurationSeconds),
        }
      : null;
  }
  selectedTabIndex = 0;

  private readonly tabNames = ['overview', 'transcript', 'research', 'news', 'urls'];

  constructor() {
    this.recordingUuid = this.route.snapshot.params['recordingUuid'];
    // Support both route param and query param for pulse context
    this.pulseConfigUuid = this.route.snapshot.params['uuid'] || this.route.snapshot.queryParams['pulse'] || null;
  }

  ngOnInit(): void {
    this.loadRecording();

    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        const tab = params['tab'];
        if (tab) {
          const index = this.tabNames.indexOf(tab);
          if (index >= 0) {
            this.selectedTabIndex = index;
          }
        }
        // Update pulse context from query param
        if (params['pulse']) {
          this.pulseConfigUuid = params['pulse'];
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadRecording(): void {
    this.loading = true;
    this.subscriptions.add(
      this.pulsesService.getPulse(this.recordingUuid).subscribe({
        next: (pulse) => {
          this.recording = pulse;
          this.rebuildRecordingDisplay();
          this.pageTitleService.setTitle(pulse.title || 'Recording');
          // Use configUuid from the recording if not already set from route
          if (!this.pulseConfigUuid && pulse.configUuid) {
            this.pulseConfigUuid = pulse.configUuid;
          }
          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load recording: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  onTabChange(index: number): void {
    const tabName = this.tabNames[index] || 'overview';
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge',
    });
  }

  playRecording(): void {
    if (!this.recording?.audioUrl) {
      this.messageService.error('Audio not yet available');
      return;
    }

    const track: AudioTrack = {
      id: this.recording.uuid,
      title: this.recording.title,
      subtitle: this.recording.configName || 'Recording',
      audioUrl: this.recording.audioUrl,
      duration: this.recording.audioDurationSeconds,
      type: 'pulse',
      sourceRoute: `/media/pulses/${this.pulseConfigUuid}/recordings/${this.recording.uuid}`,
    };

    this.audioPlayerService.play(track);
  }

  addToQueueNext(): void {
    if (!this.recording?.audioUrl) return;
    const track = this.createTrack();
    this.audioPlayerService.playNext(track);
    this.messageService.success('Added to play next');
  }

  addToQueue(): void {
    if (!this.recording?.audioUrl) return;
    const track = this.createTrack();
    this.audioPlayerService.addToQueue(track);
    this.messageService.success('Added to queue');
  }

  private createTrack(): AudioTrack {
    return {
      id: this.recording!.uuid,
      title: this.recording!.title,
      subtitle: this.recording!.configName || 'Recording',
      audioUrl: this.recording!.audioUrl,
      duration: this.recording!.audioDurationSeconds,
      type: 'pulse',
      sourceRoute: `/media/pulses/${this.pulseConfigUuid}/recordings/${this.recording!.uuid}`,
    };
  }

  copyTranscript(): void {
    if (!this.recording?.transcript) {
      this.messageService.error('No transcript available');
      return;
    }

    navigator.clipboard.writeText(this.recording.transcript).then(
      () => this.messageService.success('Transcript copied to clipboard'),
      () => this.messageService.error('Failed to copy transcript'),
    );
  }

  formatSeconds(seconds: number | null | undefined): string {
    return pulseFormatSeconds(seconds);
  }

  getStatusClass(status: string): string {
    return pulseStatusClass(status, this.recording ?? undefined);
  }

  getDisplayStatusText(): string {
    if (!this.recording) return '';
    return pulseDisplayText(this.recording);
  }

  /**
   * Optional overview sections (Summary, Error) rendered together via a single @for.
   * Returns an empty array when no recording is loaded.
   */
  get optionalOverviewSections(): readonly { title: string; body: string; sectionClass: string; bodyClass: string }[] {
    const r = this.recording;
    if (!r) {
      return [];
    }
    const sections: { title: string; body: string; sectionClass: string; bodyClass: string }[] = [];
    if (r.summary) {
      sections.push({ title: 'Summary', body: r.summary, sectionClass: 'section', bodyClass: 'summary-text' });
    }
    if (r.status === 'FAILED' && r.errorMessage) {
      sections.push({
        title: 'Error',
        body: r.errorMessage,
        sectionClass: 'section error-section',
        bodyClass: 'error-message',
      });
    }
    return sections;
  }

  /**
   * All rows shown in the metadata grid, pre-computed so the template can render with a single @for.
   * Dates are pre-formatted with the same `'medium'` format the template's `| date` pipe would use.
   */
  get metadataRows(): readonly { label: string; value: string }[] {
    const r = this.recording;
    if (!r) {
      return [];
    }
    const rows: { label: string; value: string }[] = [
      { label: 'Generated', value: this.formatMediumDate(r.generatedAt) },
      { label: 'Duration', value: this.recordingDisplay?.formattedDuration ?? '' },
      { label: 'Word Count', value: String(r.wordCount ?? 0) },
      { label: 'Trigger', value: r.isScheduled ? 'Scheduled' : 'Manual' },
    ];
    if (r.wasConverted !== undefined) {
      rows.push({
        label: 'Text Converted',
        value: r.wasConverted ? 'Yes (AI cleaned)' : 'No (verbatim)',
      });
    }
    if (r.deliveredAt) {
      rows.push({
        label: 'Delivered',
        value: `${this.formatMediumDate(r.deliveredAt)} via ${r.deliveryMethod ?? ''}`,
      });
    }
    rows.push({ label: 'Play Count', value: String(r.playCount ?? 0) });
    return rows;
  }

  /** Formats a date value identically to the template's `| date: 'medium'` pipe. */
  private formatMediumDate(value: string | number | Date | null | undefined): string {
    if (value == null || value === '') {
      return '';
    }
    return formatDate(value, 'medium', this.locale);
  }

  goBack(): void {
    if (this.pulseConfigUuid) {
      this.router.navigate(['/media/pulses', this.pulseConfigUuid], {
        queryParams: { tab: 'recordings' },
      });
    } else {
      this.router.navigate(['/media/recordings']);
    }
  }
}
