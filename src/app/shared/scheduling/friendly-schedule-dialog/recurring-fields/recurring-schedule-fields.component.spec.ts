// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DayOfWeek } from '../../schedule.types';
import { RecurringScheduleFieldsComponent } from './recurring-schedule-fields.component';

describe('RecurringScheduleFieldsComponent', () => {
  let fixture: ComponentFixture<RecurringScheduleFieldsComponent>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecurringScheduleFieldsComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(RecurringScheduleFieldsComponent);
    element = fixture.nativeElement as HTMLElement;
    fixture.componentInstance.form = new FormGroup({
      dayPattern: new FormControl('daily'),
      time: new FormControl('09:00'),
      timezone: new FormControl('UTC'),
    });
  });

  it('renders the pattern toggle and time/timezone controls', () => {
    fixture.detectChanges();
    expect(element.querySelectorAll('mat-button-toggle').length).toBe(4);
    expect(element.querySelector<HTMLInputElement>('input[formcontrolname="time"]')?.value).toBe('09:00');
    expect(element.querySelector('mat-select[formcontrolname="timezone"]')).toBeTruthy();
    expect(element.querySelector('.custom-days-section')).toBeNull();
  });

  it('shows day chips when the selector is enabled and emits toggles', () => {
    const toggled: DayOfWeek[] = [];
    fixture.componentInstance.showDaySelector = true;
    fixture.componentInstance.daysOfWeekDisplay = [
      { value: 0, short: 'Mon', selected: true },
      { value: 5, short: 'Sat', selected: false },
    ];
    fixture.componentInstance.dayToggle.subscribe((day) => toggled.push(day));
    fixture.detectChanges();

    const chips = element.querySelectorAll<HTMLButtonElement>('.day-chip');
    expect(chips.length).toBe(2);
    expect(chips[0].classList).toContain('selected');
    chips[1].click();
    expect(toggled).toEqual([5]);
  });
});
