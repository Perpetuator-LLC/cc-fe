// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ExportAccountDialogComponent } from './export-account-dialog.component';

describe('ExportAccountDialogComponent', () => {
  let fixture: ComponentFixture<ExportAccountDialogComponent>;
  let close: jasmine.Spy;

  beforeEach(async () => {
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [ExportAccountDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: {} },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExportAccountDialogComponent);
    fixture.detectChanges();
  });

  it('closes with false on cancel', () => {
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.cancel-btn')?.click();
    expect(close).toHaveBeenCalledWith(false);
  });

  it('closes with the typed confirmation on export', () => {
    fixture.componentInstance.exportConfirmation = 'hunter2';
    fixture.detectChanges(); // the confirm button is disabled until a confirmation is typed
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.delete-btn')?.click();
    expect(close).toHaveBeenCalledWith('hunter2');
  });

  it('keeps the confirm button disabled until a confirmation is typed', () => {
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.delete-btn')!;
    expect(button.disabled).toBeTrue();

    fixture.componentInstance.exportConfirmation = 'hunter2';
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();

    fixture.componentInstance.exportConfirmation = '';
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });
});
