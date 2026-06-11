// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { JobsListFilterComponent } from './jobs-list-filter.component';

describe('JobsListFilterComponent', () => {
  let fixture: ComponentFixture<JobsListFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsListFilterComponent, NoopAnimationsModule],
    }).compileComponents();
    fixture = TestBed.createComponent(JobsListFilterComponent);
    fixture.componentInstance.statusOptions = [
      { value: 'PENDING', label: 'Pending' },
      { value: 'FAILED', label: 'Failed' },
    ];
    fixture.detectChanges();
  });

  it('emits the chosen status', () => {
    const emitted: (string | null)[] = [];
    fixture.componentInstance.statusFilterChange.subscribe((value) => emitted.push(value));
    fixture.componentInstance.onChange('FAILED');
    fixture.componentInstance.onChange(null);
    expect(emitted).toEqual(['FAILED', null]);
  });

  it('renders the select control', () => {
    expect((fixture.nativeElement as HTMLElement).querySelector('mat-select')).toBeTruthy();
  });
});
