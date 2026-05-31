// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, ElementRef, input, output, ViewChild } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-job-infinite-scroll',
  standalone: true,
  imports: [MatButton, MatProgressSpinnerModule],
  templateUrl: './job-infinite-scroll.component.html',
  styleUrl: './job-infinite-scroll.component.scss',
})
export class JobInfiniteScrollComponent {
  readonly hasNextPage = input.required<boolean>();
  readonly isLoadingMore = input.required<boolean>();
  readonly loadMore = output<void>();

  @ViewChild('scrollSentinel') scrollSentinel!: ElementRef<HTMLDivElement>;
}
