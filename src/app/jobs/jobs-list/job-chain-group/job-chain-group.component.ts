// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject, input, output } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnrichedJob, JobChainGroup } from '../jobs-list.types';
import { JobStatus, iconForJob, kindToString, stringToJobStatus } from '../../job.service';
import { JobDisplayService } from '../../../job-display.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-chain-group',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, RouterLink, MatIcon, MatButton, MatTooltipModule],
  templateUrl: './job-chain-group.component.html',
  styleUrl: './job-chain-group.component.scss',
})
export class JobChainGroupComponent {
  private readonly jobDisplayService = inject(JobDisplayService);
  private readonly router = inject(Router);

  readonly chain = input.required<JobChainGroup>();
  readonly expanded = input.required<boolean>();
  readonly toggleExpanded = output<string>();

  chainStatusClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'job-success';
      case 'running':
        return 'job-running';
      case 'failed':
        return 'job-failed';
      default:
        return 'job-pending';
    }
  }

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

  getChainIcon(chain: JobChainGroup): string {
    return iconForJob(chain.firstJobKind);
  }

  getChainTitle(chain: JobChainGroup): string {
    if (chain.totalJobs === 1) {
      return kindToString(chain.firstJobKind);
    }
    const firstKind = kindToString(chain.firstJobKind);
    const lastKind = kindToString(chain.lastJobKind);
    if (firstKind === lastKind) {
      return `${firstKind} (${chain.totalJobs} jobs)`;
    }
    return `${firstKind} → ${lastKind}`;
  }

  iconForJob(kind: string): string {
    return iconForJob(kind);
  }

  kindToString(kind: string): string {
    return kindToString(kind);
  }

  getCleanErrorMessage(errorMessage: string): string {
    if (!errorMessage) return '';
    return errorMessage.replace(/^(Error:|ERROR:|error:)\s*/i, '').trim();
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

  onToggleExpanded(): void {
    const chainId = this.chain().chainId;
    if (chainId) {
      this.toggleExpanded.emit(chainId);
    }
  }
}
