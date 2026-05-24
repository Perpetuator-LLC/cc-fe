// Copyright (c) 2026 Perpetuator LLC
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DayOfWeek } from '../../schedule.types';
import { COMMON_TIMEZONES } from '../../schedule.types';

/** Day-chip display row passed in by the parent. */
export interface DayDisplay {
  value: DayOfWeek;
  short: string;
  selected: boolean;
}

@Component({
  selector: 'app-recurring-schedule-fields',
  standalone: true,
  imports: [ReactiveFormsModule, MatButton, MatButtonToggleModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './recurring-schedule-fields.component.html',
  styleUrls: ['./recurring-schedule-fields.component.scss'],
})
export class RecurringScheduleFieldsComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() showDaySelector = false;
  @Input() daysOfWeekDisplay: DayDisplay[] = [];
  @Input() timezones: typeof COMMON_TIMEZONES = COMMON_TIMEZONES;

  @Output() dayToggle = new EventEmitter<DayOfWeek>();

  onToggleDay(day: DayOfWeek): void {
    this.dayToggle.emit(day);
  }
}
