// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { StatusOption } from '../jobs-list.types';

@Component({
  selector: 'app-jobs-list-filter',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './jobs-list-filter.component.html',
  styleUrl: './jobs-list-filter.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobsListFilterComponent {
  @Input() statusFilter: string | null = null;
  @Input() statusOptions: StatusOption[] = [];
  @Output() statusFilterChange = new EventEmitter<string | null>();

  onChange(value: string | null): void {
    this.statusFilterChange.emit(value);
  }
}
