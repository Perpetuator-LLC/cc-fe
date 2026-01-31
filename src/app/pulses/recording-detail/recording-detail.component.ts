// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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

@Component({
  selector: 'app-recording-detail',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
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
  private subscriptions = new Subscription();
  protected loading = true;
  protected recordingUuid: string;
  protected pulseConfigUuid: string | null = null;

  recording: Pulse | null = null;
  selectedTabIndex = 0;

  private readonly tabNames = ['overview', 'transcript', 'research', 'news', 'urls'];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private pageTitleService: PageTitleService,
    private messageService: MessageService,
    private pulsesService: PulsesService,
    private audioPlayerService: AudioPlayerService,
  ) {
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
          this.pageTitleService.setTitle(pulse.title || 'Recording');
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
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'ready':
      case 'delivered':
        return 'status-success';
      case 'generating':
      case 'pending':
        return 'status-warning';
      case 'failed':
        return 'status-error';
      default:
        return '';
    }
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
