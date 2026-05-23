// Copyright (c) 2025-2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { MatCard, MatCardHeader, MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { Schedule } from '../../../scheduling.service';

/** Schedule enriched with pre-computed display data. */
export interface ScheduleDisplay extends Schedule {
  descriptionText: string;
  statusBadgeClass: string;
  statusLabel: string;
}

/** Output payload for toggling the enabled flag on a schedule. */
export interface ScheduleToggleEvent {
  schedule: ScheduleDisplay;
  enabled: boolean;
}

@Component({
  selector: 'app-episode-scheduling-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NgClass,
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatIcon,
    MatIconButton,
    MatButton,
    MatSlideToggle,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
  ],
  templateUrl: './episode-scheduling-tab.component.html',
  styleUrl: './episode-scheduling-tab.component.scss',
})
export class EpisodeSchedulingTabComponent {
  @Input() isLive = false;
  @Input() schedules: ScheduleDisplay[] = [];

  @Output() toggleEnabled = new EventEmitter<ScheduleToggleEvent>();
  @Output() editSchedule = new EventEmitter<ScheduleDisplay>();
  @Output() deleteSchedule = new EventEmitter<ScheduleDisplay>();
  @Output() createSchedule = new EventEmitter<void>();

  get hasSchedules(): boolean {
    return this.schedules.length > 0;
  }

  get scheduledCountLabel(): string {
    return `${this.schedules.length} scheduled`;
  }

  get addButtonLabel(): string {
    return this.hasSchedules ? 'Add Another Time' : 'Add Publishing Time';
  }

  onToggle(schedule: ScheduleDisplay, enabled: boolean): void {
    this.toggleEnabled.emit({ schedule, enabled });
  }

  onEdit(schedule: ScheduleDisplay): void {
    this.editSchedule.emit(schedule);
  }

  onDelete(schedule: ScheduleDisplay): void {
    this.deleteSchedule.emit(schedule);
  }

  onCreate(): void {
    this.createSchedule.emit();
  }
}
