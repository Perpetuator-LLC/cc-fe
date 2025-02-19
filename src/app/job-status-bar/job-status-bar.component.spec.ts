// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobStatusBarComponent } from './job-status-bar.component';

describe('JobStatusBarComponent', () => {
  let component: JobStatusBarComponent;
  let fixture: ComponentFixture<JobStatusBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobStatusBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JobStatusBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
