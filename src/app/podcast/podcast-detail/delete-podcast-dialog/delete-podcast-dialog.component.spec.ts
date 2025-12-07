// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DeletePodcastDialogComponent } from './delete-podcast-dialog.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('DeletePodcastDialogComponent', () => {
  let component: DeletePodcastDialogComponent;
  let fixture: ComponentFixture<DeletePodcastDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<DeletePodcastDialogComponent>>;
  const testPodcastName = 'Test Podcast';

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [DeletePodcastDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { podcastName: testPodcastName } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeletePodcastDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with podcast name from data', () => {
    expect(component.podcastName).toBe(testPodcastName);
  });

  it('should initialize deleteConfirmation as empty string', () => {
    expect(component.deleteConfirmation).toBe('');
  });

  it('should close dialog with false when cancel is clicked', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  it('should close dialog with confirmation value when delete is clicked with matching confirmation', () => {
    component.deleteConfirmation = testPodcastName;
    component.onDelete();
    expect(mockDialogRef.close).toHaveBeenCalledWith(testPodcastName);
  });

  it('should not close dialog when delete is clicked with non-matching confirmation', () => {
    component.deleteConfirmation = 'Wrong Name';
    component.onDelete();
    expect(mockDialogRef.close).not.toHaveBeenCalled();
  });

  it('should disable delete button when confirmation does not match podcast name', () => {
    const deleteButton: DebugElement = fixture.debugElement.query(By.css('.delete-btn'));
    expect(deleteButton.nativeElement.disabled).toBe(true);
  });

  it('should enable delete button when confirmation matches podcast name', () => {
    component.deleteConfirmation = testPodcastName;
    fixture.detectChanges();

    const deleteButton: DebugElement = fixture.debugElement.query(By.css('.delete-btn'));
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should update deleteConfirmation when user types in input field', async () => {
    const inputElement: HTMLInputElement = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;

    inputElement.value = testPodcastName;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.deleteConfirmation).toBe(testPodcastName);
  });

  it('should enable delete button when user types matching podcast name', async () => {
    const inputElement: HTMLInputElement = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;
    const deleteButton: DebugElement = fixture.debugElement.query(By.css('.delete-btn'));

    expect(deleteButton.nativeElement.disabled).toBe(true);

    inputElement.value = testPodcastName;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.deleteConfirmation).toBe(testPodcastName);
    expect(deleteButton.nativeElement.disabled).toBe(false);
  });

  it('should return confirmation value to parent component when dialog closes', async () => {
    const inputElement: HTMLInputElement = fixture.debugElement.query(By.css('input[matInput]')).nativeElement;
    const deleteButton: HTMLButtonElement = fixture.debugElement.query(By.css('.delete-btn')).nativeElement;

    inputElement.value = testPodcastName;
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    fixture.detectChanges();
    await fixture.whenStable();

    deleteButton.click();
    fixture.detectChanges();

    expect(mockDialogRef.close).toHaveBeenCalledWith(testPodcastName);
  });
});
