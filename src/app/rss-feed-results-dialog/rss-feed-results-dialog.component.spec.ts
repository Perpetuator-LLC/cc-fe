// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RssFeedResultsDialogComponent } from './rss-feed-results-dialog.component';

describe('RssFeedResultsDialogComponent', () => {
  let component: RssFeedResultsDialogComponent;
  let fixture: ComponentFixture<RssFeedResultsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RssFeedResultsDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RssFeedResultsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
