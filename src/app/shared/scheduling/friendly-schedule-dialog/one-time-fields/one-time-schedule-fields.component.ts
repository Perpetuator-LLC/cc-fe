// Copyright (c) 2026 Perpetuator LLC
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { COMMON_TIMEZONES } from '../../schedule.types';

@Component({
  selector: 'app-one-time-schedule-fields',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './one-time-schedule-fields.component.html',
  styleUrls: ['./one-time-schedule-fields.component.scss'],
})
export class OneTimeScheduleFieldsComponent {
  @Input({ required: true }) form!: FormGroup;
  @Input() minDate: Date = new Date();
  @Input() timezones: typeof COMMON_TIMEZONES = COMMON_TIMEZONES;
}
