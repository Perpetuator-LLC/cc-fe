// Copyright (c) 2025 Perpetuator LLC

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RefreshVoicesDialogComponent } from './refresh-voices-dialog.component';

describe('RefreshVoicesDialogComponent', () => {
  let component: RefreshVoicesDialogComponent;
  let fixture: ComponentFixture<RefreshVoicesDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RefreshVoicesDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RefreshVoicesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
