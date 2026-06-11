// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OneTimeScheduleFieldsComponent } from './one-time-schedule-fields.component';

describe('OneTimeScheduleFieldsComponent', () => {
  let fixture: ComponentFixture<OneTimeScheduleFieldsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OneTimeScheduleFieldsComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(OneTimeScheduleFieldsComponent);
    fixture.componentInstance.form = new FormGroup({
      scheduledDate: new FormControl<Date | null>(null),
      scheduledTime: new FormControl('09:00'),
      timezone: new FormControl('UTC'),
    });
    fixture.detectChanges();
  });

  it('renders date, time and timezone fields bound to the form', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('input[formcontrolname="scheduledDate"]')).toBeTruthy();
    const time = element.querySelector<HTMLInputElement>('input[formcontrolname="scheduledTime"]');
    expect(time?.value).toBe('09:00');
    expect(element.querySelector('mat-select[formcontrolname="timezone"]')).toBeTruthy();
  });

  it('exposes the common timezones by default', () => {
    expect(fixture.componentInstance.timezones.some((tz) => tz.value === 'UTC')).toBeTrue();
    expect(fixture.componentInstance.minDate).toBeInstanceOf(Date);
  });
});
