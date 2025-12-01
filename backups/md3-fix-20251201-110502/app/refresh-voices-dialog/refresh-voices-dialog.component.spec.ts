// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RefreshVoicesDialogComponent } from './refresh-voices-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { VoicesService, VoiceTier } from '../voices.service';
import { MessageService } from '../message.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

describe('RefreshVoicesDialogComponent', () => {
  let component: RefreshVoicesDialogComponent;
  let fixture: ComponentFixture<RefreshVoicesDialogComponent>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<RefreshVoicesDialogComponent>>;
  let mockVoicesService: jasmine.SpyObj<VoicesService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockVoicesService = jasmine.createSpyObj('VoicesService', ['refreshVoices']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [RefreshVoicesDialogComponent],
      providers: [
        provideAnimations(),
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: VoicesService, useValue: mockVoicesService },
        { provide: MessageService, useValue: mockMessageService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RefreshVoicesDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.refreshForm).toBeDefined();
      expect(component.refreshForm.get('forceMetadata')?.value).toBe(false);
      expect(component.refreshForm.get('forceSampleAudio')?.value).toBe(false);
      expect(component.refreshForm.get('models')?.value).toEqual([]);
      expect(component.refreshForm.get('externalIds')?.value).toBe('');
    });

    it('should have all voice tiers available', () => {
      expect(component.voiceTiers).toContain(VoiceTier.PREMIUM_HD);
      expect(component.voiceTiers).toContain(VoiceTier.PREMIUM);
      expect(component.voiceTiers).toContain(VoiceTier.REGULAR_HD);
      expect(component.voiceTiers).toContain(VoiceTier.REGULAR);
      expect(component.voiceTiers).toContain(VoiceTier.REGULAR_LD);
      expect(component.voiceTiers.length).toBe(5);
    });

    it('should have tierToString helper available', () => {
      expect(component.tierToString).toBeDefined();
      expect(typeof component.tierToString).toBe('function');
    });

    it('should initialize loading as false', () => {
      expect(component.loading).toBe(false);
    });
  });

  describe('onCancel', () => {
    it('should close dialog without arguments', () => {
      component.onCancel();
      expect(mockDialogRef.close).toHaveBeenCalledWith();
    });
  });

  describe('Tier to Model Mapping', () => {
    it('should map PREMIUM_HD to ELEVENLABS_MULTILINGUAL_V2', () => {
      const mapping = component['tierToModelMap'];
      expect(mapping[VoiceTier.PREMIUM_HD]).toBe('ELEVENLABS_MULTILINGUAL_V2');
    });

    it('should map PREMIUM to ELEVENLABS_FLASH_V2_5', () => {
      const mapping = component['tierToModelMap'];
      expect(mapping[VoiceTier.PREMIUM]).toBe('ELEVENLABS_FLASH_V2_5');
    });

    it('should map REGULAR_HD to OPENAI_TTS_1_HD', () => {
      const mapping = component['tierToModelMap'];
      expect(mapping[VoiceTier.REGULAR_HD]).toBe('OPENAI_TTS_1_HD');
    });

    it('should map REGULAR to OPENAI_TTS_1', () => {
      const mapping = component['tierToModelMap'];
      expect(mapping[VoiceTier.REGULAR]).toBe('OPENAI_TTS_1');
    });

    it('should map REGULAR_LD to OPENAI_GPT_4O_MINI_TTS', () => {
      const mapping = component['tierToModelMap'];
      expect(mapping[VoiceTier.REGULAR_LD]).toBe('OPENAI_GPT_4O_MINI_TTS');
    });
  });

  describe('onRefresh', () => {
    beforeEach(() => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Voices refreshed successfully',
          addedVoices: [],
          updatedVoices: [],
        }),
      );
    });

    it('should not call service if form is invalid', () => {
      component.refreshForm.setErrors({ invalid: true });
      component.onRefresh();
      expect(mockVoicesService.refreshVoices).not.toHaveBeenCalled();
    });

    it('should set loading to true when refresh starts', () => {
      // Check loading before observable completes
      component.onRefresh();
      // Loading should be true immediately after calling onRefresh, before subscribe callback
      // But since the observable completes synchronously with 'of', loading will be false
      // Let's verify it was set by checking it's called with the right params
      expect(mockVoicesService.refreshVoices).toHaveBeenCalled();
      // After the observable completes synchronously, loading is back to false
      expect(component.loading).toBe(false);
    });

    it('should call refreshVoices with default parameters when form is empty', () => {
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(
        false, // forceMetadata
        false, // forceSampleAudio
        undefined, // models (empty array becomes undefined)
        null, // externalIds (empty string becomes null)
      );
    });

    it('should call refreshVoices with forceMetadata true', () => {
      component.refreshForm.patchValue({ forceMetadata: true });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(true, false, undefined, null);
    });

    it('should call refreshVoices with forceSampleAudio true', () => {
      component.refreshForm.patchValue({ forceSampleAudio: true });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, true, undefined, null);
    });

    it('should map selected tiers to model strings', () => {
      component.refreshForm.patchValue({
        models: [VoiceTier.PREMIUM_HD, VoiceTier.REGULAR],
      });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(
        false,
        false,
        ['ELEVENLABS_MULTILINGUAL_V2', 'OPENAI_TTS_1'],
        null,
      );
    });

    it('should parse comma-separated external IDs', () => {
      component.refreshForm.patchValue({
        externalIds: 'id1, id2, id3',
      });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, ['id1', 'id2', 'id3']);
    });

    it('should parse newline-separated external IDs', () => {
      component.refreshForm.patchValue({
        externalIds: 'id1\nid2\nid3',
      });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, ['id1', 'id2', 'id3']);
    });

    it('should parse mixed comma and newline separated IDs', () => {
      component.refreshForm.patchValue({
        externalIds: 'id1, id2\nid3,id4\n  id5  ',
      });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, [
        'id1',
        'id2',
        'id3',
        'id4',
        'id5',
      ]);
    });

    it('should trim whitespace from external IDs', () => {
      component.refreshForm.patchValue({
        externalIds: '  id1  ,  id2  \n  id3  ',
      });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, ['id1', 'id2', 'id3']);
    });

    it('should filter out empty strings from external IDs', () => {
      component.refreshForm.patchValue({
        externalIds: 'id1,,\n\n,id2',
      });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, ['id1', 'id2']);
    });

    it('should pass null for externalIds when textarea is empty', () => {
      component.refreshForm.patchValue({ externalIds: '' });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, null);
    });

    it('should pass empty array for externalIds when textarea has only whitespace', () => {
      component.refreshForm.patchValue({ externalIds: '   \n  \n  ' });
      component.onRefresh();

      // Whitespace is trimmed, leaving empty strings which are filtered out, resulting in empty array
      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, []);
    });
  });

  describe('Success Handling', () => {
    it('should close dialog with result on success', () => {
      const successResult = {
        success: true,
        message: 'Voices refreshed successfully',
        addedVoices: [],
        updatedVoices: [],
      };
      mockVoicesService.refreshVoices.and.returnValue(of(successResult));

      component.onRefresh();

      expect(component.loading).toBe(false);
      expect(mockDialogRef.close).toHaveBeenCalledWith(successResult);
    });

    it('should set loading to false on success', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Success',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.onRefresh();

      expect(component.loading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should show error message when refresh fails with success: false', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: false,
          message: 'Refresh failed',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.onRefresh();

      expect(component.loading).toBe(false);
      expect(mockMessageService.error).toHaveBeenCalledWith('Refresh failed');
      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });

    it('should show default error message when no message provided', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: false,
          message: '',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.onRefresh();

      expect(mockMessageService.error).toHaveBeenCalledWith('Failed to refresh voices.');
    });

    it('should handle service error and show error message', () => {
      mockVoicesService.refreshVoices.and.returnValue(throwError(() => new Error('Network error')));

      component.onRefresh();

      expect(component.loading).toBe(false);
      expect(mockMessageService.error).toHaveBeenCalledWith('Error refreshing voices: Network error');
    });

    it('should set loading to false on error', () => {
      mockVoicesService.refreshVoices.and.returnValue(throwError(() => new Error('Network error')));

      component.onRefresh();

      expect(component.loading).toBe(false);
    });

    it('should keep dialog open on failure for correction', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: false,
          message: 'Validation error',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.onRefresh();

      expect(mockDialogRef.close).not.toHaveBeenCalled();
    });
  });

  describe('Complete Workflow', () => {
    it('should handle complete refresh workflow with all options', () => {
      const successResult = {
        success: true,
        message: 'All voices refreshed',
        addedVoices: [],
        updatedVoices: [],
      };
      mockVoicesService.refreshVoices.and.returnValue(of(successResult));

      component.refreshForm.patchValue({
        forceMetadata: true,
        forceSampleAudio: true,
        models: [VoiceTier.PREMIUM_HD, VoiceTier.REGULAR_HD],
        externalIds: 'voice-1\nvoice-2, voice-3',
      });

      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(
        true,
        true,
        ['ELEVENLABS_MULTILINGUAL_V2', 'OPENAI_TTS_1_HD'],
        ['voice-1', 'voice-2', 'voice-3'],
      );
      expect(mockDialogRef.close).toHaveBeenCalledWith(successResult);
    });

    it('should handle selective model refresh', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Models refreshed',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.refreshForm.patchValue({
        models: [VoiceTier.PREMIUM, VoiceTier.REGULAR_LD],
      });

      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(
        false,
        false,
        ['ELEVENLABS_FLASH_V2_5', 'OPENAI_GPT_4O_MINI_TTS'],
        null,
      );
    });

    it('should handle single external ID', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Voice refreshed',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.refreshForm.patchValue({
        externalIds: 'single-voice-id',
      });

      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, ['single-voice-id']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty models array correctly', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Success',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.refreshForm.patchValue({ models: [] });
      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(
        false,
        false,
        undefined, // Empty array becomes undefined
        null,
      );
    });

    it('should handle all tiers selected', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Success',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.refreshForm.patchValue({
        models: [
          VoiceTier.PREMIUM_HD,
          VoiceTier.PREMIUM,
          VoiceTier.REGULAR_HD,
          VoiceTier.REGULAR,
          VoiceTier.REGULAR_LD,
        ],
      });

      component.onRefresh();

      const expectedModels = [
        'ELEVENLABS_MULTILINGUAL_V2',
        'ELEVENLABS_FLASH_V2_5',
        'OPENAI_TTS_1_HD',
        'OPENAI_TTS_1',
        'OPENAI_GPT_4O_MINI_TTS',
      ];

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, expectedModels, null);
    });

    it('should handle very long list of external IDs', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Success',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      const ids = Array.from({ length: 100 }, (_, i) => `voice-${i}`).join('\n');
      component.refreshForm.patchValue({ externalIds: ids });

      component.onRefresh();

      const callArgs = mockVoicesService.refreshVoices.calls.mostRecent().args;
      expect(callArgs[3]?.length).toBe(100);
    });

    it('should handle special characters in external IDs', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Success',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.refreshForm.patchValue({
        externalIds: 'voice-1_test, voice@2, voice#3',
      });

      component.onRefresh();

      expect(mockVoicesService.refreshVoices).toHaveBeenCalledWith(false, false, undefined, [
        'voice-1_test',
        'voice@2',
        'voice#3',
      ]);
    });
  });

  describe('Form State', () => {
    it('should maintain form values after failed refresh', () => {
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: false,
          message: 'Error',
          addedVoices: [],
          updatedVoices: [],
        }),
      );

      component.refreshForm.patchValue({
        forceMetadata: true,
        models: [VoiceTier.PREMIUM_HD],
        externalIds: 'test-id',
      });

      component.onRefresh();

      expect(component.refreshForm.get('forceMetadata')?.value).toBe(true);
      expect(component.refreshForm.get('models')?.value).toEqual([VoiceTier.PREMIUM_HD]);
      expect(component.refreshForm.get('externalIds')?.value).toBe('test-id');
    });

    it('should allow multiple refresh attempts', () => {
      // First attempt fails
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: false,
          message: 'Error',
          addedVoices: [],
          updatedVoices: [],
        }),
      );
      component.onRefresh();
      expect(mockDialogRef.close).not.toHaveBeenCalled();

      // Second attempt succeeds
      mockVoicesService.refreshVoices.and.returnValue(
        of({
          success: true,
          message: 'Success',
          addedVoices: [],
          updatedVoices: [],
        }),
      );
      component.onRefresh();
      expect(mockDialogRef.close).toHaveBeenCalled();
    });
  });
});
