// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EpisodeDetailComponent } from './episode-detail.component';
import { MessageService } from '../message.service';

describe('EpisodeDetailComponent', () => {
  let component: EpisodeDetailComponent;
  let fixture: ComponentFixture<EpisodeDetailComponent>;
  let messageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['warning', 'error', 'success']);

    await TestBed.configureTestingModule({
      imports: [EpisodeDetailComponent, ReactiveFormsModule],
      providers: [FormBuilder, { provide: MessageService, useValue: messageServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(EpisodeDetailComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService) as jasmine.SpyObj<MessageService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * TEST SUITE: isLive Checkbox Behavior and Audio Display Logic
   *
   * BUSINESS RULES:
   * 1. Episode can only be set to live if it has audio (current version OR live version)
   * 2. Episode can always be unset from live (set to false), regardless of audio
   * 3. Live audio from previous versions should remain accessible until new audio is generated
   * 4. UI should clearly show when live audio differs from current version audio
   */

  describe('hasCurrentVersionAudio()', () => {
    it('should return true when current version has audio', () => {
      // REASON: Current version audio exists and should be playable
      component.audioSrc = 'https://example.com/audio.mp3';

      expect(component.hasCurrentVersionAudio()).toBe(true);
    });

    it('should return false when current version has no audio', () => {
      // REASON: Current version has been edited after audio generation
      // or audio has never been generated for this version
      component.audioSrc = null;

      expect(component.hasCurrentVersionAudio()).toBe(false);
    });
  });

  describe('hasLiveAudioFromDifferentVersion()', () => {
    beforeEach(() => {
      // Setup form with isLive control
      component.episodeForm = new FormBuilder().group({
        isLive: [false],
      });
    });

    it('should return false when episode is not live', () => {
      // REASON: If episode isn't live, there's no "live audio" to display
      component.episodeForm.patchValue({ isLive: false });
      component.audioSrc = 'https://example.com/v2.mp3';
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false);
    });

    it('should return false when episode is live but has no live audio', () => {
      // REASON: Edge case - episode marked as live but no audio exists
      // This shouldn't happen in production but we handle it gracefully
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = null;
      component.liveAudioSrc = null;

      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false);
    });

    it('should return false when current audio matches live audio', () => {
      // REASON: No need to show duplicate audio players
      // Current version IS the live version
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = 'https://example.com/v2.mp3';
      component.liveAudioSrc = 'https://example.com/v2.mp3';

      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false);
    });

    it('should return true when episode is live with different live audio', () => {
      // REASON: Current version audio differs from published audio
      // User needs to see BOTH: what's being edited AND what listeners hear
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = 'https://example.com/v2.mp3';
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);
    });

    it('should return true when current version has no audio but live audio exists', () => {
      // REASON: User edited transcript after publishing
      // Live audio from previous version is still being served to listeners
      // This is the CRITICAL case - shows old audio is still live while new version is being worked on
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = null; // Current version has no audio
      component.liveAudioSrc = 'https://example.com/v1.mp3'; // Previous version audio still live

      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);
    });
  });

  describe('getLiveAudioVersionText()', () => {
    it('should return version number when available', () => {
      // REASON: Be specific about which version the live audio came from
      component.liveAudioVersionNumber = 5;

      expect(component.getLiveAudioVersionText()).toBe('Version 5');
    });

    it('should return "Previous version" when version number is not available', () => {
      // REASON: Fallback when we know there's live audio but don't know which version
      component.liveAudioVersionNumber = null;

      expect(component.getLiveAudioVersionText()).toBe('Previous version');
    });
  });

  describe('onIsLiveChange() - Setting Episode Live Status', () => {
    beforeEach(() => {
      component.episodeForm = new FormBuilder().group({
        isLive: [false],
      });
      // Mock updateEpisode to prevent actual API calls in tests
      spyOn(component, 'updateEpisode');
    });

    it('should prevent setting episode as live when no audio exists', () => {
      // REASON: Cannot publish an episode without audio
      // Users must generate audio before making episode live
      component.audioSrc = null;
      component.liveAudioSrc = null;

      component.onIsLiveChange(true);

      expect(messageService.warning).toHaveBeenCalledWith(
        'Cannot set episode as live without audio. Please generate audio first.',
      );
      expect(component.episodeForm.get('isLive')?.value).toBe(false);
      expect(component.updateEpisode).not.toHaveBeenCalled();
    });

    it('should allow setting episode as live when current version has audio', () => {
      // REASON: Current version has audio - safe to publish
      component.audioSrc = 'https://example.com/v2.mp3';
      component.liveAudioSrc = null;

      component.onIsLiveChange(true);

      expect(messageService.warning).not.toHaveBeenCalled();
      expect(component.updateEpisode).toHaveBeenCalled();
    });

    it('should allow setting episode as live when live audio exists (even if current has none)', () => {
      // REASON: Previous version audio exists and can continue being served
      // This allows re-publishing after editing without regenerating audio
      component.audioSrc = null;
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      component.onIsLiveChange(true);

      expect(messageService.warning).not.toHaveBeenCalled();
      expect(component.updateEpisode).toHaveBeenCalled();
    });

    it('should allow unsetting episode from live (setting to false) even without audio', () => {
      // REASON: Users must be able to take episodes offline regardless of audio state
      // Critical for content management - can't have episodes "stuck" as live
      component.audioSrc = null;
      component.liveAudioSrc = null;

      component.onIsLiveChange(false);

      expect(messageService.warning).not.toHaveBeenCalled();
      expect(component.updateEpisode).toHaveBeenCalled();
    });
  });

  describe('shouldWarnAboutLiveEdit() - Edit Warning Logic', () => {
    beforeEach(() => {
      component.episodeForm = new FormBuilder().group({
        isLive: [false],
      });
    });

    it('should not warn when episode is not live', () => {
      // REASON: Non-live episodes can be edited freely without consequences
      component.episodeForm.patchValue({ isLive: false });
      component.audioSrc = 'https://example.com/audio.mp3';
      component.liveAudioSrc = 'https://example.com/audio.mp3';

      expect(component.shouldWarnAboutLiveEdit()).toBe(false);
    });

    it('should not warn when episode is live but has no audio', () => {
      // REASON: Edge case - if live without audio (shouldn't happen), no audio sync concern
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = null;
      component.liveAudioSrc = null;

      expect(component.shouldWarnAboutLiveEdit()).toBe(false);
    });

    it('should warn when episode is live with current version audio', () => {
      // REASON: Editing will cause transcript/audio mismatch for live episode
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = 'https://example.com/audio.mp3';
      component.liveAudioSrc = null;

      expect(component.shouldWarnAboutLiveEdit()).toBe(true);
    });

    it('should warn when episode is live with previous version audio', () => {
      // REASON: Even though current version has no audio, old audio is still being served live
      // Editing transcript will make it further out of sync with live audio
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = null;
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      expect(component.shouldWarnAboutLiveEdit()).toBe(true);
    });
  });

  /**
   * INTEGRATION TEST SCENARIOS
   * These document the expected full user workflows
   */

  describe('User Workflow Scenarios', () => {
    it('Scenario 1: Creating and publishing a new episode', () => {
      // Step 1: Episode created with no audio
      component.audioSrc = null;
      component.liveAudioSrc = null;
      expect(component.hasCurrentVersionAudio()).toBe(false);

      // Step 2: Generate audio for current version
      component.audioSrc = 'https://example.com/v1.mp3';
      expect(component.hasCurrentVersionAudio()).toBe(true);

      // Step 3: Set episode live (should succeed)
      component.episodeForm = new FormBuilder().group({ isLive: [false] });
      spyOn(component, 'updateEpisode');
      component.onIsLiveChange(true);
      expect(component.updateEpisode).toHaveBeenCalled();
      expect(messageService.warning).not.toHaveBeenCalled();
    });

    it('Scenario 2: Editing a live episode after audio generation', () => {
      // Setup: Episode is live with audio
      component.episodeForm = new FormBuilder().group({ isLive: [true] });
      component.audioSrc = 'https://example.com/v1.mp3';
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      // User edits transcript - should see warning
      expect(component.shouldWarnAboutLiveEdit()).toBe(true);

      // After edit, audio becomes out of sync, but still shows current audio
      expect(component.hasCurrentVersionAudio()).toBe(true);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false); // Same audio
    });

    it('Scenario 3: Editing transcript of live episode (audio clears)', () => {
      // Setup: Episode is live with audio
      component.episodeForm = new FormBuilder().group({ isLive: [true] });
      component.audioSrc = 'https://example.com/v1.mp3';
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      // User edits transcript - backend clears current version audio
      component.audioSrc = null; // Current version audio cleared by backend

      // Should show previous version is still live
      expect(component.hasCurrentVersionAudio()).toBe(false);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);
      expect(component.getLiveAudioVersionText()).toBe('Previous version');

      // User can still uncheck isLive
      spyOn(component, 'updateEpisode');
      component.onIsLiveChange(false);
      expect(component.updateEpisode).toHaveBeenCalled();
    });

    it('Scenario 4: Restoring old version of live episode', () => {
      // Setup: Episode is live, current version different from live
      component.episodeForm = new FormBuilder().group({ isLive: [true] });
      component.audioSrc = 'https://example.com/v3.mp3';
      component.liveAudioSrc = 'https://example.com/v2.mp3';

      // Should show both audio versions
      expect(component.hasCurrentVersionAudio()).toBe(true);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);

      // After restore, audio should update
      component.audioSrc = 'https://example.com/v2.mp3';

      // Now they match, should only show current
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false);
    });
  });
});
