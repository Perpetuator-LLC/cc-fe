// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDeleteDialogComponent, ConfirmDeleteDialogData } from './confirm-delete-dialog.component';

describe('ConfirmDeleteDialogComponent', () => {
  let close: jasmine.Spy;

  async function create(data: ConfirmDeleteDialogData): Promise<ComponentFixture<ConfirmDeleteDialogComponent>> {
    close = jasmine.createSpy('close');
    await TestBed.configureTestingModule({
      imports: [ConfirmDeleteDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfirmDeleteDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the title, message and default button labels', async () => {
    const fixture = await create({ title: 'Delete podcast?', message: 'This cannot be undone.' });
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h2')?.textContent).toContain('Delete podcast?');
    expect(element.querySelector('.message')?.textContent).toContain('This cannot be undone.');
    const buttons = element.querySelectorAll('button');
    expect(buttons[0].textContent).toContain('Cancel');
    expect(buttons[1].textContent).toContain('Delete');
  });

  it('honors custom button labels and closes with the chosen result', async () => {
    const fixture = await create({
      title: 'Archive?',
      message: 'Really?',
      confirmButtonText: 'Archive',
      cancelButtonText: 'Keep',
    });
    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button');
    expect(buttons[0].textContent).toContain('Keep');
    expect(buttons[1].textContent).toContain('Archive');

    buttons[0].click();
    expect(close).toHaveBeenCalledWith(false);
    buttons[1].click();
    expect(close).toHaveBeenCalledWith(true);
  });
});
