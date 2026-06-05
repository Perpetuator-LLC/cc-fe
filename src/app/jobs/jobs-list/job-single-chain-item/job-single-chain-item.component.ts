// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject, input } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnrichedJob } from '../jobs-list.types';
import { JobStatus, iconForJob, kindToString, stringToJobStatus } from '../../job.service';
import { JobDisplayService } from '../../../job-display.service';
import { PillComponent, PillVariant } from '../../../shared/ui/pill/pill.component';

@Component({
  selector: 'app-job-single-chain-item',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, MatIcon, MatTooltipModule, PillComponent],
  templateUrl: './job-single-chain-item.component.html',
  styleUrl: './job-single-chain-item.component.scss',
})
export class JobSingleChainItemComponent {
  private readonly jobDisplayService = inject(JobDisplayService);

  readonly job = input.required<EnrichedJob>();

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
