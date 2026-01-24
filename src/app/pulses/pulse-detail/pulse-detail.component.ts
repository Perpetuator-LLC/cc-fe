// Copyright (c) 2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, debounceTime, filter, switchMap } from 'rxjs';
import { MessageService } from '../../message.service';
import { PulsesService } from '../pulses.service';
import { PulseConfig, ContentSource, AlertTrigger, Pulse, DeliveryMethod, ScheduleFrequency } from '../pulses.types';
import { ToolbarService } from '../../layout/toolbar.service';
import { LoadingService } from '../../layout/loading.service';
import { ShareService } from '../../share.service';
import { JobService } from '../../jobs/job.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatTooltip } from '@angular/material/tooltip';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatSliderModule } from '@angular/material/slider';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { AddContentSourceDialogComponent } from '../add-content-source-dialog/add-content-source-dialog.component';
import { AddAlertTriggerDialogComponent } from '../add-alert-trigger-dialog/add-alert-trigger-dialog.component';
import { Job } from '../../jobs/job.service';

@Component({
  selector: 'app-pulse-detail',
  templateUrl: './pulse-detail.component.html',
  styleUrls: ['./pulse-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinner,
    MatProgressBarModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButton,
    MatMenuModule,
    MatButtonModule,
    MatIcon,
    MatInputModule,
    MatIconButton,
    MatCardContent,
    MatCheckbox,
    MatTooltip,
    FormsModule,
    MatCard,
    MatSelect,
    MatOption,
    MatTabsModule,
    CdkTextareaAutosize,
    MatSliderModule,
    MatTableModule,
    MatChipsModule,
  ],
})
export class PulseDetailComponent implements OnInit, OnDestroy {
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  pulseForm: FormGroup;
  private subscriptions = new Subscription();
  protected loading = true;
  protected pulseConfigUuid: string;
  protected selectedTabIndex = 0;
  protected generatingPulse = false;

  // Data
  pulseConfig: PulseConfig | null = null;
  contentSources: ContentSource[] = [];
  alertTriggers: AlertTrigger[] = [];
  pulses: Pulse[] = [];

  // Options
  toneOptions = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'formal', label: 'Formal' },
    { value: 'conversational', label: 'Conversational' },
  ];

  deliveryOptions: { value: DeliveryMethod; label: string }[] = [
    { value: 'in_app', label: 'In-App Only' },
    { value: 'email_link', label: 'Email' },
    { value: 'sms_link', label: 'SMS (requires verified phone)' },
  ];

  scheduleOptions: { value: ScheduleFrequency; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'once', label: 'One-time' },
  ];

  private readonly tabNames = ['settings', 'content', 'alerts', 'schedule', 'history'];

  // Content source columns
  contentSourceColumns = ['sourceType', 'sourceDetail', 'priority', 'isActive', 'actions'];

  // Alert trigger columns
  alertTriggerColumns = ['alertType', 'details', 'isActive', 'actions'];

  // Pulse history columns
  pulseHistoryColumns = ['title', 'status', 'duration', 'createdAt', 'actions'];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private pulsesService: PulsesService,
    private loadingService: LoadingService,
    protected shareService: ShareService,
    private dialog: MatDialog,
    private jobService: JobService,
  ) {
    const uuidParam = this.route.snapshot.paramMap.get('uuid');
    if (!uuidParam) {
      throw new Error('Failed to get Pulse Config ID from route.');
    }
    this.pulseConfigUuid = this.shareService.extractIdFromSlugParam(uuidParam);

    this.pulseForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      isActive: [true],
      targetDurationMinutes: [3, [Validators.required, Validators.min(1), Validators.max(10)]],
      tone: ['professional'],
      customInstructions: [''],
      includeIntro: [true],
      includeOutro: [true],
      deliveryMethod: ['in_app'],
      scheduleFrequency: ['daily'],
      scheduleTime: ['07:00'],
      scheduleTimezone: ['America/New_York'],
      newsLookbackHours: [24, [Validators.min(1), Validators.max(168)]],
    });
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.messageService.clearMessages();

    // Initialize tab from query parameter
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        const tabParam = params['tab'];
        if (tabParam) {
          const tabIndex = this.tabNames.indexOf(tabParam);
          if (tabIndex !== -1) {
            this.selectedTabIndex = tabIndex;
          }
        }
      }),
    );

    this.loadPulseConfig();
    this.loadPulseHistory();
    this.setupAutoSave();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPulseConfig(): void {
    this.loading = true;
    this.loadingService.show();

    this.subscriptions.add(
      this.pulsesService.getPulseConfig(this.pulseConfigUuid).subscribe({
        next: (config) => {
          this.pulseConfig = config;
          this.contentSources = config.contentSources || [];
          this.alertTriggers = config.alertTriggers || [];

          this.pulseForm.patchValue({
            name: config.name,
            description: config.description,
            isActive: config.isActive,
            targetDurationMinutes: config.targetDurationMinutes,
            tone: config.tone,
            customInstructions: config.customInstructions || '',
            includeIntro: config.includeIntro,
            includeOutro: config.includeOutro,
            deliveryMethod: config.deliveryMethod,
            scheduleFrequency: config.scheduleFrequency,
            scheduleTime: config.scheduleTime || '07:00',
            scheduleTimezone: config.scheduleTimezone,
            newsLookbackHours: config.newsLookbackHours,
          });

          this.pulseForm.markAsPristine();
          this.loading = false;
          this.loadingService.hide();
        },
        error: (err) => {
          this.loading = false;
          this.loadingService.hide();
          this.messageService.error(`Failed to load pulse config: ${err.message}`);
        },
      }),
    );
  }

  private loadPulseHistory(): void {
    this.subscriptions.add(
      this.pulsesService.getPulses(this.pulseConfigUuid, undefined, 20).subscribe({
        next: (response) => {
          this.pulses = response.pulses;
        },
        error: (err) => {
          this.messageService.error(`Failed to load pulse history: ${err.message}`);
        },
      }),
    );
  }

  private setupAutoSave(): void {
    this.subscriptions.add(
      this.pulseForm.valueChanges
        .pipe(
          debounceTime(1500),
          filter(() => this.pulseForm.valid && this.pulseForm.dirty),
          switchMap((formValue) => {
            return this.pulsesService.updatePulseConfig(this.pulseConfigUuid, formValue);
          }),
        )
        .subscribe({
          next: () => {
            this.pulseForm.markAsPristine();
            this.messageService.info('Changes saved');
          },
          error: (err) => {
            this.messageService.error(`Failed to save changes: ${err.message}`);
          },
        }),
    );
  }

  onTabChange(index: number): void {
    this.selectedTabIndex = index;
    const tabName = this.tabNames[index];
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge',
    });
  }

  // Content Sources
  addContentSource(): void {
    const dialogRef = this.dialog.open(AddContentSourceDialogComponent, {
      width: '500px',
      data: { pulseConfigUuid: this.pulseConfigUuid },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.contentSources = [...this.contentSources, result];
      }
    });
  }

  removeContentSource(uuid: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Remove Content Source',
        message: 'Are you sure you want to remove this content source?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.pulsesService.removeContentSource(uuid).subscribe({
            next: () => {
              this.contentSources = this.contentSources.filter((s) => s.uuid !== uuid);
              this.messageService.success('Content source removed');
            },
            error: (err) => {
              this.messageService.error(`Failed to remove content source: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  // Alert Triggers
  addAlertTrigger(): void {
    const dialogRef = this.dialog.open(AddAlertTriggerDialogComponent, {
      width: '500px',
      data: { pulseConfigUuid: this.pulseConfigUuid },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.alertTriggers = [...this.alertTriggers, result];
      }
    });
  }

  removeAlertTrigger(uuid: string): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Remove Alert Trigger',
        message: 'Are you sure you want to remove this alert trigger?',
        confirmText: 'Remove',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.pulsesService.removeAlertTrigger(uuid).subscribe({
            next: () => {
              this.alertTriggers = this.alertTriggers.filter((t) => t.uuid !== uuid);
              this.messageService.success('Alert trigger removed');
            },
            error: (err) => {
              this.messageService.error(`Failed to remove alert trigger: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  // Generate Pulse
  generatePulse(): void {
    this.generatingPulse = true;

    this.subscriptions.add(
      this.pulsesService.generatePulse(this.pulseConfigUuid).subscribe({
        next: (result) => {
          this.generatingPulse = false;
          this.messageService.info('Pulse generation started...');
          if (result.jobUuid) {
            this.jobService.addJob({
              uuid: result.jobUuid,
              kind: 'generate_pulse',
              status: 'pending',
              createdAt: new Date().toISOString(),
            } as Job);
          }
        },
        error: (err) => {
          this.generatingPulse = false;
          this.messageService.error(`Failed to generate pulse: ${err.message}`);
        },
      }),
    );
  }

  // Delete pulse config
  deletePulseConfig(): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete Pulse Configuration',
        message: 'Are you sure you want to delete this pulse configuration? This action cannot be undone.',
        confirmText: 'Delete',
        danger: true,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.subscriptions.add(
          this.pulsesService.deletePulseConfig(this.pulseConfigUuid).subscribe({
            next: () => {
              this.messageService.success('Pulse configuration deleted');
              this.router.navigate(['/media/pulses']);
            },
            error: (err) => {
              this.messageService.error(`Failed to delete pulse config: ${err.message}`);
            },
          }),
        );
      }
    });
  }

  // Helpers
  formatDuration(value: number): string {
    return `${value} min`;
  }

  formatSeconds(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatTimeAgo(dateString: string | null | undefined): string {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  }

  getSourceTypeIcon(type: string): string {
    switch (type) {
      case 'rss_feed':
        return 'rss_feed';
      case 'search_term':
        return 'search';
      case 'watchlist':
        return 'list';
      case 'company':
        return 'business';
      default:
        return 'source';
    }
  }

  getSourceTypeLabel(type: string): string {
    switch (type) {
      case 'rss_feed':
        return 'RSS Feed';
      case 'search_term':
        return 'Search Term';
      case 'watchlist':
        return 'Watchlist';
      case 'company':
        return 'Company';
      default:
        return type;
    }
  }

  getAlertTypeIcon(type: string): string {
    switch (type) {
      case 'breaking_news':
        return 'breaking_news';
      case 'price_alert':
        return 'trending_up';
      case 'earnings':
        return 'attach_money';
      case 'sec_filing':
        return 'description';
      default:
        return 'notifications';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
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

  playPulse(pulse: Pulse): void {
    if (pulse.audioUrl) {
      window.open(pulse.audioUrl, '_blank');
    }
  }
}
