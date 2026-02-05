// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { DeleteAccountDialogComponent } from './delete-account-dialog.component';

describe('DeleteAccountDialogComponent', () => {
  let component: DeleteAccountDialogComponent;
  let fixture: ComponentFixture<DeleteAccountDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeleteAccountDialogComponent>>;
  const testEmail = 'test@example.com';

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DeleteAccountDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { email: testEmail } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteAccountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with the provided email', () => {
    expect(component.email).toBe(testEmail);
  });

  it('should have empty deleteConfirmation initially', () => {
    expect(component.deleteConfirmation).toBe('');
  });

  it('should display placeholder text with email', () => {
    expect(component.placeholderText).toBe(`Type email '${testEmail}' to confirm`);
  });

  it('should close dialog with false on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should NOT close dialog when confirmation does not match email', () => {
    component.deleteConfirmation = 'wrong@email.com';
    component.onDelete();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should close dialog with the email confirmation when it matches', () => {
    component.deleteConfirmation = testEmail;
    component.onDelete();
    expect(mockDialogRef.close).toHaveBeenCalledWith(testEmail);
  });

  it('should disable delete button when confirmation does not match', () => {
    const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));
    expect(deleteButton.nativeElement.disabled).toBe(true);

    // Type wrong email
    component.deleteConfirmation = 'wrong@email.com';
    fixture.detectChanges();
    expect(deleteButton.nativeElement.disabled).toBe(true);
  });

  it('should enable delete button when confirmation matches email', async () => {
    const inputElement: HTMLInputElement = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;
    const deleteButton = fixture.debugElement.query(By.css('.delete-btn'));

    expect(deleteButton.nativeElement.disabled).toBe(true);

    // Type matching email
    inputElement.value = testEmail;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.deleteConfirmation).toBe(testEmail);
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should return the email (not just true) when user confirms deletion', async () => {
    // This is the critical test that catches the original bug
    // The dialog must return the actual email, not just true
    component.deleteConfirmation = testEmail;
    component.onDelete();

    // The dialog should close with the email string, not boolean true
    expect(mockDialogRef.close).toHaveBeenCalledWith(testEmail);
    expect(mockDialogRef.close).not.toHaveBeenCalledWith(true);
  });
});
