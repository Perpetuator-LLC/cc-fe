// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { RssFeedResultsDialogComponent } from './rss-feed-results-dialog.component';

describe('RssFeedResultsDialogComponent', () => {
  let component: RssFeedResultsDialogComponent;
  let fixture: ComponentFixture<RssFeedResultsDialogComponent>;

  beforeEach(async () => {
    const mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    const mockData = {
      successful: [],
      failed: [],
    };

    await TestBed.configureTestingModule({
      imports: [RssFeedResultsDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RssFeedResultsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
