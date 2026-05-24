// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EnrichedJob, JobChainGroup } from '../jobs-list.types';
import { JobsListResourcesComponent } from '../jobs-list-resources/jobs-list-resources.component';

/**
 * Renders one standalone job (or a single-job chain). Inputs are
 * pre-computed during enrichment so the template only does property
 * lookups.
 */
@Component({
  selector: 'app-jobs-list-item',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    NgClass,
    UpperCasePipe,
    MatIcon,
    MatIconButton,
    MatTooltipModule,
    JobsListResourcesComponent,
  ],
  templateUrl: './jobs-list-item.component.html',
  styleUrl: './jobs-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListItemComponent {
  @Input() item!: EnrichedJob | JobChainGroup;
  @Output() retry = new EventEmitter<string>();
  @Output() delete = new EventEmitter<string>();
  @Output() symbolClick = new EventEmitter<EnrichedJob>();

  /** The single job to display (either the standalone job or the first job of a single-job chain). */
  get job(): EnrichedJob {
    if (this.item.isChainGroup) {
      return this.item.jobs[0];
    }
    return this.item;
  }

  /** True when this is a single-job chain (different meta-block visibility). */
  get isSingleJobChain(): boolean {
    return this.item.isChainGroup;
  }

  onRetry(): void {
    this.retry.emit(this.job.uuid);
  }

  onDelete(): void {
    this.delete.emit(this.job.uuid);
  }

  onSymbolClick(job: EnrichedJob): void {
    this.symbolClick.emit(job);
  }
}
