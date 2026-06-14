// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobsListEmptyComponent } from './jobs-list-empty.component';

describe('JobsListEmptyComponent', () => {
  let fixture: ComponentFixture<JobsListEmptyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobsListEmptyComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(JobsListEmptyComponent);
  });

  it('shows the generic empty message without a filter', () => {
    fixture.detectChanges();
    const message = (fixture.nativeElement as HTMLElement).querySelector('.empty-state-message');
    expect(message?.textContent).toContain('No jobs have been created yet');
  });

  it('mentions the active filter label when filtered', () => {
    fixture.componentInstance.statusFilter = 'FAILED';
    fixture.componentInstance.statusFilterLabel = 'Failed';
    fixture.detectChanges();
    const message = (fixture.nativeElement as HTMLElement).querySelector('.empty-state-message');
    expect(message?.textContent).toContain('No jobs found with status "Failed"');
  });
});
