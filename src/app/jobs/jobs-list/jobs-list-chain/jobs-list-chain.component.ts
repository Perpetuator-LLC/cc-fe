// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass, UpperCasePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { EnrichedJob, JobChainGroup } from '../jobs-list.types';
import { JobsListChainResourcesComponent } from '../jobs-list-resources/jobs-list-resources.component';

@Component({
  selector: 'app-jobs-list-chain',
  standalone: true,
  imports: [DatePipe, DecimalPipe, NgClass, UpperCasePipe, MatIcon, JobsListChainResourcesComponent],
  templateUrl: './jobs-list-chain.component.html',
  styleUrl: './jobs-list-chain.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListChainComponent {
  @Input() item!: JobChainGroup;
  @Output() toggleExpanded = new EventEmitter<string>();
  @Output() symbolClick = new EventEmitter<EnrichedJob>();

  onToggle(): void {
    if (this.item.chainId) {
      this.toggleExpanded.emit(this.item.chainId);
    }
  }

  onSymbolClick(job: EnrichedJob): void {
    this.symbolClick.emit(job);
  }

  get expandIcon(): string {
    return this.item.expanded ? 'expand_less' : 'expand_more';
  }
}
