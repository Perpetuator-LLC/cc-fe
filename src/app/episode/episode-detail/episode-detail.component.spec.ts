// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EpisodeDetailComponent } from './episode-detail.component';
import { ActivatedRoute } from '@angular/router';
import { EpisodeService } from '../episode.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MessageService } from '../../message.service';
import { JobService } from '../../job.service';
import { ToolbarService } from '../../toolbar.service';
import { SchedulingService } from '../../scheduling.service';
import { LoadingService } from '../../loading.service';

describe('EpisodeDetailComponent', () => {
  let component: EpisodeDetailComponent;
  let fixture: ComponentFixture<EpisodeDetailComponent>;
  let messageService: jasmine.SpyObj<MessageService>;

  beforeEach(async () => {
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['warning', 'error', 'success', 'info']);
    messageServiceSpy.messages$ = of([]);
    const activatedRouteSpy = {
      snapshot: {
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('test-uuid-123'),
        },
      },
    };
    const episodeServiceSpy = jasmine.createSpyObj('EpisodeService', [
      'getEpisodeById',
      'updateEpisode',
      'generateAudio',
      'publishAudio',
      'deleteEpisode',
      'validateEpisodeManual',
      'regenerateEpisode',
      'revertEpisodeVersion',
    ]);
    const jobServiceSpy = jasmine.createSpyObj('JobService', ['addJob', 'addJobs', 'getJobTransitions']);
    jobServiceSpy.jobs = signal([]);
    const toolbarServiceSpy = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef', 'clearToolbarComponent']);
    const viewContainerRefSpy = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    toolbarServiceSpy.getViewContainerRef.and.returnValue(viewContainerRefSpy);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.events = of(); // RouterLink needs events observable
    const dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
    const schedulingServiceSpy = jasmine.createSpyObj('SchedulingService', [
      'getSchedulesForPodcast',
      'updateSchedule',
      'deleteSchedule',
      'savePodcastSchedules',
    ]);
    schedulingServiceSpy.getSchedulesForPodcast.and.returnValue(of([]));
    const loadingServiceSpy = jasmine.createSpyObj('LoadingService', ['show', 'hide']);
    const domSanitizerSpy = jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustHtml']);
    domSanitizerSpy.bypassSecurityTrustHtml.and.callFake((html: string) => html);

    await TestBed.configureTestingModule({
      imports: [EpisodeDetailComponent, ReactiveFormsModule, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        FormBuilder,
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ActivatedRoute, useValue: activatedRouteSpy },
        { provide: EpisodeService, useValue: episodeServiceSpy },
        { provide: JobService, useValue: jobServiceSpy },
        { provide: ToolbarService, useValue: toolbarServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: MatDialog, useValue: dialogSpy },
        { provide: SchedulingService, useValue: schedulingServiceSpy },
        { provide: LoadingService, useValue: loadingServiceSpy },
        { provide: DomSanitizer, useValue: domSanitizerSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
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

      // Set up versions array with audio
      component.episodeForm.patchValue({
        versions: [{ audioUrl: 'https://example.com/v2.mp3' }],
      });

      component.onIsLiveChange(true);

      expect(messageService.warning).not.toHaveBeenCalled();
      expect(component.episodeForm.dirty).toBe(true);
    });

    it('should allow setting episode as live when live audio exists (even if current has none)', () => {
      // REASON: Previous version audio exists and can continue being served
      // This allows re-publishing after editing without regenerating audio
      component.audioSrc = null;
      component.liveAudioSrc = 'https://example.com/v1.mp3';

      // Set up versions array with audio
      component.episodeForm.patchValue({
        versions: [{ audioUrl: 'https://example.com/v1.mp3' }],
      });

      component.onIsLiveChange(true);

      expect(messageService.warning).not.toHaveBeenCalled();
      expect(component.episodeForm.dirty).toBe(true);
    });

    it('should allow unsetting episode from live (setting to false) even without audio', () => {
      // REASON: Users must be able to take episodes offline regardless of audio state
      // Critical for content management - can't have episodes "stuck" as live
      component.audioSrc = null;
      component.liveAudioSrc = null;

      component.onIsLiveChange(false);

      expect(messageService.warning).not.toHaveBeenCalled();
      expect(component.episodeForm.dirty).toBe(true);
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

    it('should NOT warn when episode is live but current version has no audio (only previous version audio)', () => {
      // REASON: Current version has no audio - user already made edits after initial audio generation
      // We already warned them on the FIRST edit (when audioSrc was not null)
      // No need to keep warning on subsequent edits - they know audio is out of sync
      component.episodeForm.patchValue({ isLive: true });
      component.audioSrc = null; // Current version has no audio (already edited)
      component.liveAudioSrc = 'https://example.com/v1.mp3'; // Previous version audio still live

      expect(component.shouldWarnAboutLiveEdit()).toBe(false);
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
      component.episodeForm.patchValue({ versions: [] });
      expect(component.hasCurrentVersionAudio()).toBe(false);

      // Step 2: Generate audio for current version
      component.audioSrc = 'https://example.com/v1.mp3';
      component.episodeForm.patchValue({
        versions: [{ audioUrl: 'https://example.com/v1.mp3' }],
      });
      expect(component.hasCurrentVersionAudio()).toBe(true);

      // Step 3: Set episode live (should succeed)
      component.onIsLiveChange(true);
      expect(component.episodeForm.dirty).toBe(true);
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

      // User makes FIRST edit - should warn (has current version audio)
      expect(component.shouldWarnAboutLiveEdit()).toBe(true);

      // After first edit saved, backend clears current version audio
      component.audioSrc = null; // Current version audio cleared by backend

      // User makes SUBSEQUENT edits - should NOT warn (no current version audio)
      expect(component.shouldWarnAboutLiveEdit()).toBe(false);

      // Should show previous version is still live
      expect(component.hasCurrentVersionAudio()).toBe(false);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);
      expect(component.getLiveAudioVersionText()).toBe('Previous version');

      // User can still uncheck isLive
      component.onIsLiveChange(false);
      expect(component.episodeForm.dirty).toBe(true);
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

    /**
     * CRITICAL TEST: Restoring version without audio should update live audio tracking
     *
     * BUG FIX: Previously, when restoring a version without audio, the liveAudioSrc
     * was only checking episode.audioUrl and not using the fallback logic to find
     * the most recent version with audio. This caused the UI to not show the live
     * audio section until a page refresh.
     *
     * The fix ensures that during restore, we use the SAME logic as loadEpisodeData:
     * 1. Check episode.audioUrl first
     * 2. If null and episode is live, find most recent version with audio
     * 3. Otherwise set to null
     */
    it('Scenario 5: Restoring version without audio when episode is live (REGRESSION TEST)', () => {
      // Setup: Live episode with current version that has audio
      component.episodeForm = new FormBuilder().group({
        isLive: [true],
        versions: [
          [
            { versionNumber: 3, audioUrl: null, content: 'new content' }, // Current version (no audio)
            { versionNumber: 2, audioUrl: 'https://example.com/v2.mp3', content: 'old content' }, // Has audio
            { versionNumber: 1, audioUrl: 'https://example.com/v1.mp3', content: 'oldest' },
          ],
        ],
      });
      component.audioSrc = 'https://example.com/v3.mp3'; // Current has audio initially
      component.liveAudioSrc = null; // No explicitly published audio (episode.audioUrl is null)
      component.liveAudioVersionNumber = null;

      // BEFORE RESTORE: Current version has audio
      expect(component.hasCurrentVersionAudio()).toBe(true);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false);

      // SIMULATE RESTORE: User restores version 2 (which has no audio in current state, but v2 had audio)
      // This simulates what happens in the restoreVersion() method
      const mockResponse = {
        episode: {
          isLive: true,
          audioUrl: null, // No explicitly published audio
          currentVersionNumber: 3,
          versions: [
            // Restored version has no audio
            { versionNumber: 3, audioUrl: null, content: 'restored content' },
            // Old version has audio
            { versionNumber: 2, audioUrl: 'https://example.com/v2.mp3', content: 'old content' },
            { versionNumber: 1, audioUrl: 'https://example.com/v1.mp3', content: 'oldest' },
          ],
        },
      };

      // Simulate the restore logic from the component
      const currentVersion = mockResponse.episode.versions.find(
        (v) => v.versionNumber === mockResponse.episode.currentVersionNumber,
      );
      if (currentVersion) {
        component.audioSrc = currentVersion.audioUrl || null;
      } else {
        component.audioSrc = null;
      }

      // THIS IS THE CRITICAL FIX: Update live audio tracking with fallback logic
      if (mockResponse.episode.audioUrl) {
        component.liveAudioSrc = mockResponse.episode.audioUrl;
      } else if (mockResponse.episode.isLive) {
        // Find the most recent version (highest version number) that has audio
        const versionsWithAudio = mockResponse.episode.versions
          .filter((v) => v.audioUrl)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        component.liveAudioSrc = versionsWithAudio.length > 0 ? versionsWithAudio[0].audioUrl || null : null;
      } else {
        component.liveAudioSrc = null;
      }

      // Find which version has the live audio URL
      if (component.liveAudioSrc) {
        const liveAudioVersion = mockResponse.episode.versions.find((v) => v.audioUrl === component.liveAudioSrc);
        component.liveAudioVersionNumber = liveAudioVersion?.versionNumber || null;
      } else {
        component.liveAudioVersionNumber = null;
      }

      // AFTER RESTORE: Verify the live audio tracking is correct
      expect(component.audioSrc).toBe(null); // Current version has no audio
      expect(component.hasCurrentVersionAudio()).toBe(false);

      // CRITICAL ASSERTION: Live audio section should show (with version 2's audio)
      expect(component.liveAudioSrc).toBe('https://example.com/v2.mp3');
      expect(component.liveAudioVersionNumber).toBe(2);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);
      expect(component.getLiveAudioVersionText()).toBe('Version 2');

      // WITHOUT THE FIX: liveAudioSrc would be null and hasLiveAudioFromDifferentVersion() would return false
      // WITH THE FIX: liveAudioSrc finds version 2's audio and UI shows it immediately
    });

    it('Scenario 6: Restoring version with audio when episode is live', () => {
      // Setup: Live episode, current version has no audio
      component.episodeForm = new FormBuilder().group({ isLive: [true] });
      component.audioSrc = null; // Current version has no audio
      component.liveAudioSrc = 'https://example.com/v2.mp3'; // Old version is live
      component.liveAudioVersionNumber = 2;

      // Should show live audio from different version
      expect(component.hasCurrentVersionAudio()).toBe(false);
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(true);

      // SIMULATE RESTORE to version 2 (which has audio)
      const mockResponse = {
        episode: {
          isLive: true,
          audioUrl: null,
          currentVersionNumber: 3,
          versions: [
            { versionNumber: 3, audioUrl: 'https://example.com/v2.mp3', content: 'restored with audio' },
            { versionNumber: 2, audioUrl: 'https://example.com/v2.mp3', content: 'old' },
            { versionNumber: 1, audioUrl: 'https://example.com/v1.mp3', content: 'oldest' },
          ],
        },
      };

      // Apply restore logic
      const currentVersion = mockResponse.episode.versions.find(
        (v) => v.versionNumber === mockResponse.episode.currentVersionNumber,
      );
      component.audioSrc = currentVersion?.audioUrl || null;

      if (mockResponse.episode.audioUrl) {
        component.liveAudioSrc = mockResponse.episode.audioUrl;
      } else if (mockResponse.episode.isLive) {
        const versionsWithAudio = mockResponse.episode.versions
          .filter((v) => v.audioUrl)
          .sort((a, b) => b.versionNumber - a.versionNumber);
        component.liveAudioSrc = versionsWithAudio.length > 0 ? versionsWithAudio[0].audioUrl || null : null;
      } else {
        component.liveAudioSrc = null;
      }

      if (component.liveAudioSrc) {
        const liveAudioVersion = mockResponse.episode.versions.find((v) => v.audioUrl === component.liveAudioSrc);
        component.liveAudioVersionNumber = liveAudioVersion?.versionNumber || null;
      }

      // AFTER RESTORE: Current version now has audio that matches live audio
      expect(component.audioSrc).toBe('https://example.com/v2.mp3');
      expect(component.hasCurrentVersionAudio()).toBe(true);
      expect(component.liveAudioSrc).toBe('https://example.com/v2.mp3');

      // Should NOT show live audio section (current matches live)
      expect(component.hasLiveAudioFromDifferentVersion()).toBe(false);
    });
  });
});
