// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject, input, output } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnrichedJob } from '../jobs-list.types';
import { JobStatus, iconForJob, kindToString, stringToJobStatus } from '../../job.service';
import { JobDisplayService } from '../../../job-display.service';
import { Router } from '@angular/router';
import { PillComponent, PillVariant } from '../../../shared/ui/pill/pill.component';

@Component({
  selector: 'app-job-standalone-item',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    RouterLink,
    MatIcon,
    MatButton,
    MatIconButton,
    MatTooltipModule,
    PillComponent,
  ],
  templateUrl: './job-standalone-item.component.html',
  styleUrl: './job-standalone-item.component.scss',
})
export class JobStandaloneItemComponent {
  private readonly jobDisplayService = inject(JobDisplayService);
  private readonly router = inject(Router);

  readonly item = input.required<EnrichedJob>();
  readonly retry = output<string>();
  readonly delete = output<string>();

  protected readonly JobStatus = JobStatus;

  statusClass(status: string): string {
    switch (stringToJobStatus(status)) {
      case JobStatus.PENDING:
        return 'job-pending';
      case JobStatus.RUNNING:
        return 'job-running';
      case JobStatus.COMPLETED:
        return 'job-success';
      case JobStatus.FAILED:
        return 'job-failed';
      default:
        return '';
    }
  }

  iconForJob(kind: string): string {
    return iconForJob(kind);
  }

  kindToString(kind: string): string {
    return kindToString(kind);
  }

  stringToJobStatus(status: string): JobStatus {
    return stringToJobStatus(status);
  }

  statusVariant(status: string): PillVariant {
    switch (stringToJobStatus(status)) {
      case JobStatus.PENDING:
        return 'warning';
      case JobStatus.RUNNING:
        return 'info';
      case JobStatus.COMPLETED:
        return 'success';
      case JobStatus.FAILED:
        return 'error';
      default:
        return 'surface';
    }
  }

  getCleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return '';
    return errorMessage.replace(/^(Error:|ERROR:|error:)\s*/i, '').trim();
  }

  getCleanJobMessage(job: EnrichedJob): string {
    const message = this.jobDisplayService.getJobMessage(job);
    if (this.isErrorMessage(message)) {
      return this.getCleanErrorMessage(message);
    }
    return message;
  }

  hasPodcastUuid(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasPodcastUuid(job);
  }

  hasEpisodeUuid(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasEpisodeUuid(job);
  }

  hasTopicUuid(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasTopicUuid(job);
  }

  hasPulseConfigUuid(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasPulseConfigUuid(job);
  }

  hasBlogUuid(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasBlogUuid(job);
  }

  hasArticleUuid(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasArticleUuid(job);
  }

  hasSymbol(job: EnrichedJob): boolean {
    return this.jobDisplayService.hasSymbol(job);
  }

  getPodcastUuid(job: EnrichedJob): string | null {
    return this.jobDisplayService.getPodcastUuid(job);
  }

  getEpisodeUuid(job: EnrichedJob): string | null {
    return this.jobDisplayService.getEpisodeUuid(job);
  }

  getTopicUuid(job: EnrichedJob): string | null {
    return this.jobDisplayService.getTopicUuid(job);
  }

  getPulseConfigUuid(job: EnrichedJob): string | null {
    return this.jobDisplayService.getPulseConfigUuid(job);
  }

  getBlogUuid(job: EnrichedJob): string | null {
    return this.jobDisplayService.getBlogUuid(job);
  }

  getArticleUuid(job: EnrichedJob): string | null {
    return this.jobDisplayService.getArticleUuid(job);
  }

  getPodcastName(job: EnrichedJob): string {
    return job.podcastName || 'Podcast';
  }

  getEpisodeName(job: EnrichedJob): string {
    return job.episodeName || 'Episode';
  }

  getTopicName(job: EnrichedJob): string {
    return job.topicName || 'Topic';
  }

  getPulseConfigName(job: EnrichedJob): string {
    return job.pulseConfigName || 'Pulse';
  }

  getBlogName(job: EnrichedJob): string {
    return this.jobDisplayService.getBlogName(job) || 'Blog';
  }

  getArticleTitle(job: EnrichedJob): string {
    return this.jobDisplayService.getArticleTitle(job) || 'Article';
  }

  getSymbol(job: EnrichedJob): string | null {
    return this.jobDisplayService.getSymbol(job);
  }

  getSymbolTooltip(job: EnrichedJob): string {
    const fqn = this.jobDisplayService.getFqn(job);
    const interval = this.jobDisplayService.getInterval(job);
    const parts: string[] = [];
    if (fqn) parts.push(`FQN: ${fqn}`);
    if (interval) parts.push(`Interval: ${interval}`);
    parts.push('Click to view chart');
    return parts.join('\n');
  }

  navigateToSymbol(job: EnrichedJob): void {
    const symbol = this.jobDisplayService.getSymbol(job);
    const exchange = this.jobDisplayService.getExchange(job);
    const interval = this.jobDisplayService.getInterval(job) || 'daily';

    if (symbol) {
      this.router.navigate(['/terminal'], {
        queryParams: {
          tab: 'watchlists',
          symbol: symbol,
          exchange: exchange || undefined,
          view: 'chart',
          interval: interval,
        },
      });
    }
  }

  private isErrorMessage(message: string): boolean {
    if (!message) return false;
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('error') ||
      lowerMessage.includes('fail') ||
      lowerMessage.includes('exception') ||
      lowerMessage.includes('traceback')
    );
  }
}
