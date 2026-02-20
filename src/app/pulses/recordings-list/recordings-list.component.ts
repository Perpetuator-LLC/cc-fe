// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { PulseConfig, Pulse, PulseStatus } from '../pulses.types';
import { AudioPlayerService, AudioTrack } from '../../shared/audio-player/audio-player.service';
import { PageTitleService } from '../../layout/page-title.service';
import {
  getStatusClass as pulseStatusClass,
  getDisplayStatusText as pulseDisplayText,
  formatSeconds as pulseFormatSeconds,
  formatTimeAgo as pulseFormatTimeAgo,
} from '../pulse-status.utils';
import {
  CreateRecordingDialogComponent,
  CreateRecordingDialogData,
  CreateRecordingDialogResult,
} from '../create-recording-dialog/create-recording-dialog.component';

@Component({
  selector: 'app-recordings-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatTooltipModule,
    MatPaginatorModule,
  ],
  templateUrl: './recordings-list.component.html',
  styleUrl: './recordings-list.component.scss',
})
export class RecordingsListComponent implements OnInit, OnDestroy {
  // Dependencies
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly pulsesService = inject(PulsesService);
  private readonly audioPlayerService = inject(AudioPlayerService);
  private readonly pageTitleService = inject(PageTitleService);
  private readonly dialog = inject(MatDialog);

  private subscriptions = new Subscription();

  // Data
  recordings: Pulse[] = [];
  pulseConfigs: PulseConfig[] = [];
  loading = true;
  totalCount = 0;

  // Filters
  searchControl = new FormControl('');
  pulseConfigControl = new FormControl<string | null>(null);
  statusControl = new FormControl<string | null>(null);

  // Pagination
  pageSize = 20;
  pageIndex = 0;
  private currentCursor: string | null = null;
  private cursorMap = new Map<number, string | null>();

  // Status options
  statusOptions: { value: string | null; label: string }[] = [
    { value: null, label: 'All Statuses' },
    { value: 'READY', label: 'Ready' },
    { value: 'GENERATING', label: 'Generating' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'DELIVERED', label: 'Delivered' },
  ];

  ngOnInit(): void {
    this.pageTitleService.setTitle('Recordings');

    // Load pulse configs for filter dropdown
    this.loadPulseConfigs();

    // Handle query params for initial filter state
    this.route.queryParams.subscribe((params) => {
      if (params['pulse']) {
        this.pulseConfigControl.setValue(params['pulse'], { emitEvent: false });
      }
      if (params['status']) {
        this.statusControl.setValue(params['status'], { emitEvent: false });
      }
      if (params['search']) {
        this.searchControl.setValue(params['search'], { emitEvent: false });
      }
    });

    // Setup filter subscriptions
    this.setupFilterSubscriptions();

    // Initial load
    this.loadRecordings();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPulseConfigs(): void {
    this.subscriptions.add(
      this.pulsesService.getPulseConfigs(100).subscribe({
        next: (response) => {
          this.pulseConfigs = response.pulseConfigs;
        },
        error: (err) => {
          this.messageService.error(`Failed to load pulses: ${err.message}`);
        },
      }),
    );
  }

  private setupFilterSubscriptions(): void {
    // Search with debounce
    this.subscriptions.add(
      this.searchControl.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
        this.resetPagination();
        this.loadRecordings();
        this.updateQueryParams();
      }),
    );

    // Pulse config filter
    this.subscriptions.add(
      this.pulseConfigControl.valueChanges.subscribe(() => {
        this.resetPagination();
        this.loadRecordings();
        this.updateQueryParams();
      }),
    );

    // Status filter
    this.subscriptions.add(
      this.statusControl.valueChanges.subscribe(() => {
        this.resetPagination();
        this.loadRecordings();
        this.updateQueryParams();
      }),
    );
  }

  private resetPagination(): void {
    this.pageIndex = 0;
    this.currentCursor = null;
    this.cursorMap.clear();
    this.cursorMap.set(0, null);
  }

  private updateQueryParams(): void {
    const queryParams: Record<string, string | null> = {};

    if (this.pulseConfigControl.value) {
      queryParams['pulse'] = this.pulseConfigControl.value;
    }
    if (this.statusControl.value) {
      queryParams['status'] = this.statusControl.value;
    }
    if (this.searchControl.value) {
      queryParams['search'] = this.searchControl.value;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  loadRecordings(): void {
    this.loading = true;

    const configUuid = this.pulseConfigControl.value || undefined;
    const status = this.statusControl.value || undefined;
    const search = this.searchControl.value || undefined;

    this.subscriptions.add(
      this.pulsesService.getPulses(configUuid, status, search, this.pageSize, this.currentCursor).subscribe({
        next: (response) => {
          this.recordings = response.pulses;
          this.totalCount = response.totalCount;

          // Store cursor for next page
          if (response.pageInfo.endCursor) {
            this.cursorMap.set(this.pageIndex + 1, response.pageInfo.endCursor);
          }

          this.loading = false;
        },
        error: (err) => {
          this.messageService.error(`Failed to load recordings: ${err.message}`);
          this.loading = false;
        },
      }),
    );
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.currentCursor = this.cursorMap.get(this.pageIndex) || null;
    this.loadRecordings();
  }

  viewRecording(recording: Pulse): void {
    // Find the pulse config for this recording
    const config = this.pulseConfigs.find((c) => c.name === recording.configName);
    if (config) {
      this.router.navigate(['/media/pulses', config.uuid, 'recordings', recording.uuid]);
    } else {
      // Fallback: navigate to recording without pulse context
      this.router.navigate(['/media/recordings', recording.uuid]);
    }
  }

  playRecording(recording: Pulse): void {
    if (!recording.audioUrl) {
      this.messageService.error('Audio not yet available');
      return;
    }

    const track: AudioTrack = {
      id: recording.uuid,
      title: recording.title,
      subtitle: recording.configName || 'Recording',
      audioUrl: recording.audioUrl,
      duration: recording.audioDurationSeconds,
      type: 'pulse',
      sourceRoute: `/media/recordings/${recording.uuid}`,
    };

    this.audioPlayerService.play(track);
  }

  addToQueueNext(recording: Pulse): void {
    if (!recording.audioUrl) return;
    const track = this.createTrack(recording);
    this.audioPlayerService.playNext(track);
    this.messageService.success('Added to play next');
  }

  addToQueue(recording: Pulse): void {
    if (!recording.audioUrl) return;
    const track = this.createTrack(recording);
    this.audioPlayerService.addToQueue(track);
    this.messageService.success('Added to queue');
  }

  private createTrack(recording: Pulse): AudioTrack {
    return {
      id: recording.uuid,
      title: recording.title,
      subtitle: recording.configName || 'Recording',
      audioUrl: recording.audioUrl,
      duration: recording.audioDurationSeconds,
      type: 'pulse',
      sourceRoute: `/media/recordings/${recording.uuid}`,
    };
  }

  createRecording(): void {
    const dialogRef = this.dialog.open(CreateRecordingDialogComponent, {
      width: '600px',
      data: {} as CreateRecordingDialogData,
    });

    this.subscriptions.add(
      dialogRef.afterClosed().subscribe((result: CreateRecordingDialogResult | undefined) => {
        if (result) {
          // Refresh the recordings list
          this.resetPagination();
          this.loadRecordings();
        }
      }),
    );
  }

  formatSeconds(seconds: number | null | undefined): string {
    return pulseFormatSeconds(seconds);
  }

  formatTimeAgo(dateStr: string): string {
    return pulseFormatTimeAgo(dateStr);
  }

  getStatusClass(status: PulseStatus, recording?: Pulse): string {
    return pulseStatusClass(status, recording);
  }

  getDisplayStatusText(recording: Pulse): string {
    return pulseDisplayText(recording);
  }

  clearFilters(): void {
    this.searchControl.setValue('');
    this.pulseConfigControl.setValue(null);
    this.statusControl.setValue(null);
  }

  hasActiveFilters(): boolean {
    return !!(this.searchControl.value || this.pulseConfigControl.value || this.statusControl.value);
  }
}
