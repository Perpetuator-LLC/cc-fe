// Copyright (c) 2026 Perpetuator LLC
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface WeekDot {
  value: number;
  letter: string;
  active: boolean;
}

@Component({
  selector: 'app-week-strip',
  standalone: true,
  imports: [],
  templateUrl: './week-strip.component.html',
  styleUrls: ['./week-strip.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekStripComponent {
  @Input({ required: true }) dots: WeekDot[] = [];
}
