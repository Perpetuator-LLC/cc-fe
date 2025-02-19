// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRssFeedDialogComponent } from './add-rss-feed-dialog.component';

describe('AddRssFeedDialogComponent', () => {
  let component: AddRssFeedDialogComponent;
  let fixture: ComponentFixture<AddRssFeedDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRssFeedDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AddRssFeedDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
