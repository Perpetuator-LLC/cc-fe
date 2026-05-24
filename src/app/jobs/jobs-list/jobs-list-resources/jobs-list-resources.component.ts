// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { ChainResources, EnrichedJob, JobDisplay } from '../jobs-list.types';

/**
 * Renders the resource tag row for a single standalone job. Either
 * `display` (single job) or `resources` (chain aggregated) is provided.
 */
@Component({
  selector: 'app-jobs-list-resources',
  standalone: true,
  imports: [MatButton, MatIcon, MatTooltipModule, RouterLink],
  templateUrl: './jobs-list-resources.component.html',
  styleUrl: './jobs-list-resources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListResourcesComponent {
  @Input() display: JobDisplay | null = null;
  @Input() job: EnrichedJob | null = null;
  @Output() symbolClick = new EventEmitter<EnrichedJob>();

  onSymbolClick(): void {
    if (this.job) {
      this.symbolClick.emit(this.job);
    }
  }
}

/**
 * Renders the aggregated resources for a chain.
 */
@Component({
  selector: 'app-jobs-list-chain-resources',
  standalone: true,
  imports: [MatButton, MatIcon, MatTooltipModule, RouterLink],
  templateUrl: './jobs-list-chain-resources.component.html',
  styleUrl: './jobs-list-resources.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListChainResourcesComponent {
  @Input() resources!: ChainResources;
  @Output() symbolClick = new EventEmitter<EnrichedJob>();

  onSymbolClick(job: EnrichedJob): void {
    this.symbolClick.emit(job);
  }

  onStopPropagation(event: Event): void {
    event.stopPropagation();
  }
}
