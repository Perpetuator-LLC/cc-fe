// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { ScheduleListComponent } from '../../../../shared/scheduling/schedule-list/schedule-list.component';

@Component({
  selector: 'app-pulse-schedule-tab',
  standalone: true,
  imports: [ScheduleListComponent],
  templateUrl: './pulse-schedule-tab.component.html',
  styleUrl: './pulse-schedule-tab.component.scss',
})
export class PulseScheduleTabComponent {
  @Input({ required: true }) pulseConfigUuid!: string;
}
