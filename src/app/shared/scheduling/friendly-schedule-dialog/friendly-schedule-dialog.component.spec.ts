// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from '../../../message.service';
import { Schedule } from '../../../scheduling.service';
import { SchedulingService } from '../../../scheduling.service';
import { FriendlyScheduleDialogComponent, FriendlyScheduleDialogData } from './friendly-schedule-dialog.component';

describe('FriendlyScheduleDialogComponent', () => {
  let close: jasmine.Spy;
  let error: jasmine.Spy;

  function create(data: FriendlyScheduleDialogData): ComponentFixture<FriendlyScheduleDialogComponent> {
    // Reset so a single test can build the dialog under more than one `data`.
    TestBed.resetTestingModule();
    close = jasmine.createSpy('close');
    error = jasmine.createSpy('error');
    TestBed.configureTestingModule({
      imports: [FriendlyScheduleDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
        { provide: MessageService, useValue: { error, success: jasmine.createSpy('success') } },
        {
          provide: SchedulingService,
          useValue: {
            createSchedule: jasmine.createSpy('createSchedule'),
            updateSchedule: jasmine.createSpy('updateSchedule'),
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(FriendlyScheduleDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  describe('dialog title and edit state', () => {
    it('shows the create flow for the podcast context', () => {
      const c = create({ context: 'podcast' }).componentInstance;
      expect(c.isEditing).toBeFalse();
      expect(c.dialogTitle).toBe('Schedule Podcast Episodes');
      expect(c.submitButtonText).toBe('Create Schedule');
    });

    it('titles the pulse and episode contexts', () => {
      expect(create({ context: 'pulse' }).componentInstance.dialogTitle).toBe('Schedule Pulse Recording');
      expect(create({ context: 'episode' }).componentInstance.dialogTitle).toBe('Schedule Episode Release');
    });

    it('switches to the edit flow when a schedule is supplied', () => {
      const c = create({ context: 'podcast', schedule: { uuid: 's1' } as Schedule }).componentInstance;
      expect(c.isEditing).toBeTrue();
      expect(c.dialogTitle).toBe('Edit Schedule');
      expect(c.submitButtonText).toBe('Update Schedule');
    });
  });

  describe('podcast field state', () => {
    it('locks and displays a pre-selected podcast', () => {
      const c = create({
        context: 'podcast',
        podcastUuid: 'pod-1',
        podcastName: 'Daily Brief',
      }).componentInstance;
      c.scheduleForm.patchValue({ jobKind: 'PUBLISH_LATEST_EPISODE_CHAIN' });
      expect(c.isPodcastLocked).toBeTrue();
      expect(c.showPodcastDisplay).toBeTrue();
      expect(c.showPodcastSelect).toBeFalse();
      expect(c.selectedPodcastName).toBe('Daily Brief');
    });

    it('offers a podcast select when a list is supplied and nothing is locked', () => {
      const c = create({
        context: 'podcast',
        podcasts: [{ uuid: 'pod-1', name: 'Show A' }],
      }).componentInstance;
      c.scheduleForm.patchValue({ jobKind: 'PUBLISH_LATEST_EPISODE_CHAIN', podcastUuid: 'pod-1' });
      expect(c.isPodcastLocked).toBeFalse();
      expect(c.showPodcastSelect).toBeTrue();
      expect(c.selectedPodcastName).toBe('Show A');
    });
  });

  describe('pulse and episode field state', () => {
    it('locks a pre-selected pulse and resolves its name', () => {
      const c = create({
        context: 'pulse',
        pulseConfigUuid: 'pc-1',
        pulseConfigs: [{ uuid: 'pc-1', name: 'Market Pulse' }],
      }).componentInstance;
      c.scheduleForm.patchValue({ jobKind: 'PUBLISH_PULSE_CHAIN' });
      expect(c.isPulseLocked).toBeTrue();
      expect(c.showPulseDisplay).toBeTrue();
      expect(c.selectedPulseName).toBe('Market Pulse');
    });

    it('treats the episode context as an episode release with a locked episode', () => {
      const c = create({
        context: 'episode',
        episodeUuid: 'ep-1',
        episodeName: 'Episode One',
      }).componentInstance;
      expect(c.isEpisodeRelease).toBeTrue();
      expect(c.isEpisodeLocked).toBeTrue();
      expect(c.showEpisodeDisplay).toBeTrue();
      expect(c.showEpisodeSelect).toBeFalse();
    });
  });

  describe('recurrence and day selection', () => {
    it('reports recurring state and the custom-day selector visibility', () => {
      const c = create({ context: 'podcast' }).componentInstance;
      c.scheduleForm.patchValue({ scheduleType: 'recurring', dayPattern: 'weekdays' });
      expect(c.isRecurring).toBeTrue();
      expect(c.showDaySelector).toBeFalse();
      c.scheduleForm.patchValue({ dayPattern: 'custom' });
      expect(c.showDaySelector).toBeTrue();
    });

    it('toggles individual days and switches to the custom pattern', () => {
      const c = create({ context: 'podcast' }).componentInstance;
      c.scheduleForm.patchValue({ selectedDays: [0, 1, 2, 3, 4] });
      expect(c.isDaySelected(5)).toBeFalse();
      c.toggleDay(5);
      expect(c.isDaySelected(5)).toBeTrue();
      expect(c.scheduleForm.get('dayPattern')?.value).toBe('custom');
      c.toggleDay(5);
      expect(c.isDaySelected(5)).toBeFalse();
    });
  });

  describe('validation and actions', () => {
    it('reports the name error only once the control is invalid and touched', () => {
      const c = create({ context: 'podcast' }).componentInstance;
      c.scheduleForm.get('name')?.setValue('');
      expect(c.nameHasError).toBeFalse();
      c.scheduleForm.get('name')?.markAsTouched();
      expect(c.nameHasError).toBeTrue();
    });

    it('blocks submit and warns when the form is invalid', () => {
      const c = create({ context: 'podcast' }).componentInstance;
      c.scheduleForm.get('name')?.setValue('');
      c.onSubmit();
      expect(error).toHaveBeenCalledWith('Please fill in all required fields');
    });

    it('closes the dialog on cancel', () => {
      const c = create({ context: 'podcast' }).componentInstance;
      c.onCancel();
      expect(close).toHaveBeenCalled();
    });
  });
});
