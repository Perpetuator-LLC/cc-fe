// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-jobs-list-empty',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './jobs-list-empty.component.html',
  styleUrl: './jobs-list-empty.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListEmptyComponent {
  @Input() statusFilter: string | null = null;
  @Input() statusFilterLabel = '';
}
