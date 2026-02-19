// Copyright (c) 2026 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioPlayerBarComponent } from './audio-player-bar.component';
import { AudioPlayerService, AudioTrack } from './audio-player.service';
import { signal, Signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';

// Extended mock type that includes both spy methods and signal properties
type MockAudioPlayerService = jasmine.SpyObj<AudioPlayerService> & {
  track: Signal<AudioTrack | null>;
  queue: Signal<AudioTrack[]>;
  isPlaying: Signal<boolean>;
  currentTime: Signal<number>;
  duration: Signal<number>;
  volume: Signal<number>;
  isMuted: Signal<boolean>;
  isLoading: Signal<boolean>;
  error: Signal<string | null>;
  hasTrack: Signal<boolean>;
  hasQueue: Signal<boolean>;
  queueLength: Signal<number>;
  progress: Signal<number>;
  _trackSignal: WritableSignal<AudioTrack | null>;
  _queueSignal: WritableSignal<AudioTrack[]>;
};

describe('AudioPlayerBarComponent', () => {
  let component: AudioPlayerBarComponent;
  let fixture: ComponentFixture<AudioPlayerBarComponent>;
  let mockAudioService: MockAudioPlayerService;
  let mockRouter: jasmine.SpyObj<Router>;

  // Test tracks
  const trackA: AudioTrack = { id: 'a', title: 'Track A', audioUrl: 'a.mp3', type: 'episode' };
  const trackB: AudioTrack = { id: 'b', title: 'Track B', audioUrl: 'b.mp3', type: 'episode' };
  const trackC: AudioTrack = { id: 'c', title: 'Track C', audioUrl: 'c.mp3', type: 'episode' };
  const trackD: AudioTrack = { id: 'd', title: 'Track D', audioUrl: 'd.mp3', type: 'episode' };
  const trackE: AudioTrack = { id: 'e', title: 'Track E', audioUrl: 'e.mp3', type: 'episode' };
  const trackF: AudioTrack = { id: 'f', title: 'Track F', audioUrl: 'f.mp3', type: 'episode' };
  const trackG: AudioTrack = { id: 'g', title: 'Track G', audioUrl: 'g.mp3', type: 'episode' };

  beforeEach(async () => {
    // Create mock signals for the audio service
    const trackSignal = signal<AudioTrack | null>(null);
    const queueSignal = signal<AudioTrack[]>([]);
    const isPlayingSignal = signal(false);
    const currentTimeSignal = signal(0);
    const durationSignal = signal(0);
    const volumeSignal = signal(1);
    const isMutedSignal = signal(false);
    const isLoadingSignal = signal(false);
    const errorSignal = signal<string | null>(null);
    const hasTrackSignal = signal(false);
    const hasQueueSignal = signal(false);
    const queueLengthSignal = signal(0);
    const progressSignal = signal(0);

    const baseMock = jasmine.createSpyObj('AudioPlayerService', [
      'play',
      'togglePlay',
      'pause',
      'stop',
      'seek',
      'seekToPercent',
      'skipForward',
      'skipBackward',
      'toggleMute',
      'addToQueue',
      'playNext',
      'removeFromQueue',
      'clearQueue',
      'setQueue',
      'skipToTrack',
      'formatTime',
    ]);

    // Assign signals as properties
    mockAudioService = Object.assign(baseMock, {
      track: trackSignal.asReadonly(),
      queue: queueSignal.asReadonly(),
      isPlaying: isPlayingSignal.asReadonly(),
      currentTime: currentTimeSignal.asReadonly(),
      duration: durationSignal.asReadonly(),
      volume: volumeSignal.asReadonly(),
      isMuted: isMutedSignal.asReadonly(),
      isLoading: isLoadingSignal.asReadonly(),
      error: errorSignal.asReadonly(),
      hasTrack: hasTrackSignal.asReadonly(),
      hasQueue: hasQueueSignal.asReadonly(),
      queueLength: queueLengthSignal.asReadonly(),
      progress: progressSignal.asReadonly(),
      _trackSignal: trackSignal,
      _queueSignal: queueSignal,
    }) as MockAudioPlayerService;

    mockAudioService.formatTime.and.returnValue('0:00');

    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [AudioPlayerBarComponent],
      providers: [
        { provide: AudioPlayerService, useValue: mockAudioService },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AudioPlayerBarComponent);
    component = fixture.componentInstance;

    // Clear localStorage for clean tests
    localStorage.removeItem('audio-player-history');
  });

  afterEach(() => {
    localStorage.removeItem('audio-player-history');
  });

  describe('playFromHistory', () => {
    /**
     * Scenario:
     * - History: [D (most recent), C, B, A (oldest)]
     * - Current track: E
     * - Queue: [F, G]
     * - User clicks on B
     *
     * Expected after clicking B:
     * - B starts playing
     * - Queue should be: [C, D, E, F, G]
     * - History should be: [A]
     */
    it('should restore play order correctly when clicking a track in middle of history', () => {
      // Setup: History with D (most recent), C, B, A (oldest)
      // History is stored with most recent at index 0
      component.history = [trackD, trackC, trackB, trackA];

      // Current track is E
      mockAudioService._trackSignal.set(trackE);

      // Queue has F and G
      mockAudioService._queueSignal.set([trackF, trackG]);

      // User clicks on B (index 2 in history)
      component.playFromHistory(trackB);

      // Verify setQueue was called with correct order
      expect(mockAudioService.setQueue).toHaveBeenCalledTimes(1);
      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // Queue should be: [C, D, E, F, G]
      // C and D are the tracks more recent than B (reversed to oldest first)
      // E is the current track
      // F and G are the existing queue
      expect(setQueueCall.length).toBe(5);
      expect(setQueueCall[0].id).toBe('c'); // C was played after B, before D
      expect(setQueueCall[1].id).toBe('d'); // D was most recent
      expect(setQueueCall[2].id).toBe('e'); // E is current
      expect(setQueueCall[3].id).toBe('f'); // Existing queue
      expect(setQueueCall[4].id).toBe('g'); // Existing queue

      // Verify play was called with B
      expect(mockAudioService.play).toHaveBeenCalledWith(trackB);

      // Verify history now only contains A (older than B)
      expect(component.history.length).toBe(1);
      expect(component.history[0].id).toBe('a');
    });

    /**
     * Scenario:
     * - History: [C, B, A]
     * - Current track: D
     * - Queue: []
     * - User clicks on A (oldest)
     *
     * Expected:
     * - A plays
     * - Queue: [B, C, D]
     * - History: []
     */
    it('should work when clicking the oldest track in history with empty queue', () => {
      component.history = [trackC, trackB, trackA];
      mockAudioService._trackSignal.set(trackD);
      mockAudioService._queueSignal.set([]);

      component.playFromHistory(trackA);

      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // Queue should be [B, C, D]
      expect(setQueueCall.length).toBe(3);
      expect(setQueueCall[0].id).toBe('b');
      expect(setQueueCall[1].id).toBe('c');
      expect(setQueueCall[2].id).toBe('d');

      expect(mockAudioService.play).toHaveBeenCalledWith(trackA);
      expect(component.history.length).toBe(0);
    });

    /**
     * Scenario:
     * - History: [B, A]
     * - Current track: C
     * - Queue: [D, E]
     * - User clicks on B (most recent in history)
     *
     * Expected:
     * - B plays
     * - Queue: [C, D, E] (no history items to add before current)
     * - History: [A]
     */
    it('should work when clicking the most recent track in history', () => {
      component.history = [trackB, trackA];
      mockAudioService._trackSignal.set(trackC);
      mockAudioService._queueSignal.set([trackD, trackE]);

      component.playFromHistory(trackB);

      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // Queue should be [C, D, E] - no history items before B
      expect(setQueueCall.length).toBe(3);
      expect(setQueueCall[0].id).toBe('c');
      expect(setQueueCall[1].id).toBe('d');
      expect(setQueueCall[2].id).toBe('e');

      expect(mockAudioService.play).toHaveBeenCalledWith(trackB);
      expect(component.history.length).toBe(1);
      expect(component.history[0].id).toBe('a');
    });

    /**
     * Scenario:
     * - History: [B, A]
     * - Current track: null (nothing playing)
     * - Queue: [C]
     * - User clicks on A
     *
     * Expected:
     * - A plays
     * - Queue: [B, C]
     * - History: []
     */
    it('should work when there is no current track', () => {
      component.history = [trackB, trackA];
      mockAudioService._trackSignal.set(null);
      mockAudioService._queueSignal.set([trackC]);

      component.playFromHistory(trackA);

      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // Queue should be [B, C] - B from history, C from queue, no current track
      expect(setQueueCall.length).toBe(2);
      expect(setQueueCall[0].id).toBe('b');
      expect(setQueueCall[1].id).toBe('c');

      expect(mockAudioService.play).toHaveBeenCalledWith(trackA);
      expect(component.history.length).toBe(0);
    });

    /**
     * Scenario: Check for duplicate prevention
     * - History: [C, B, A]
     * - Current track: D
     * - Queue: [B, E] (B is duplicated in queue)
     * - User clicks on A
     *
     * Expected:
     * - A plays
     * - Queue: [B, C, D, E] - B only appears once
     * - History: []
     */
    it('should not add duplicate tracks to queue', () => {
      component.history = [trackC, trackB, trackA];
      mockAudioService._trackSignal.set(trackD);
      mockAudioService._queueSignal.set([trackB, trackE]); // B is in both history and queue

      component.playFromHistory(trackA);

      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // Queue should be [B, C, D, E] - B only once
      expect(setQueueCall.length).toBe(4);
      expect(setQueueCall[0].id).toBe('b');
      expect(setQueueCall[1].id).toBe('c');
      expect(setQueueCall[2].id).toBe('d');
      expect(setQueueCall[3].id).toBe('e');

      // Verify B is not duplicated
      const bCount = setQueueCall.filter((t: AudioTrack) => t.id === 'b').length;
      expect(bCount).toBe(1);
    });

    /**
     * Scenario: Track not in history
     * - History: [B, A]
     * - User tries to play C (not in history)
     *
     * Expected: Nothing happens
     */
    it('should do nothing if track is not in history', () => {
      component.history = [trackB, trackA];
      mockAudioService._trackSignal.set(trackD);
      mockAudioService._queueSignal.set([]);

      component.playFromHistory(trackC); // C is not in history

      expect(mockAudioService.setQueue).not.toHaveBeenCalled();
      expect(mockAudioService.play).not.toHaveBeenCalled();
      expect(component.history.length).toBe(2); // History unchanged
    });

    /**
     * BUG REPRODUCTION: User reported that clicking on history item
     * takes the last item from the queue and puts it before the clicked track.
     *
     * Scenario:
     * - History: [C, B, A] - C most recent, A oldest
     * - Current track: D
     * - Queue: [E, F, G] - E plays next, then F, then G
     * - User clicks on B
     *
     * Expected queue order after clicking B:
     * - B plays now
     * - Queue: [C, D, E, F, G] - C (from history), D (current), E, F, G (existing queue)
     *
     * BUG would show: G appearing before C somehow
     */
    it('should NOT move last queue item to front when playing from history', () => {
      component.history = [trackC, trackB, trackA];
      mockAudioService._trackSignal.set(trackD);
      mockAudioService._queueSignal.set([trackE, trackF, trackG]);

      component.playFromHistory(trackB);

      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // The queue should be exactly [C, D, E, F, G]
      expect(setQueueCall.length).toBe(5);

      // C should be first (was played after B, needs to be replayed)
      expect(setQueueCall[0].id).toBe('c');

      // D (current track) should be second
      expect(setQueueCall[1].id).toBe('d');

      // E, F, G should maintain their original order at the end
      expect(setQueueCall[2].id).toBe('e');
      expect(setQueueCall[3].id).toBe('f');
      expect(setQueueCall[4].id).toBe('g');

      // G should NOT be at the front or anywhere before its original position
      expect(setQueueCall[0].id).not.toBe('g');
      expect(setQueueCall[1].id).not.toBe('g');
    });

    /**
     * Test to verify the exact queue ordering with complex scenario
     */
    it('should maintain exact queue ordering: [history items reversed] + [current] + [existing queue]', () => {
      // History: [E, D, C, B, A] - E most recent
      component.history = [trackE, trackD, trackC, trackB, trackA];

      // Current: F
      mockAudioService._trackSignal.set(trackF);

      // Queue: [G]
      mockAudioService._queueSignal.set([trackG]);

      // Click on C (index 2 in history)
      component.playFromHistory(trackC);

      const setQueueCall = mockAudioService.setQueue.calls.mostRecent().args[0];

      // Tracks after C in history: [E, D] (indices 0, 1)
      // Reversed for queue: [D, E]
      // Plus current: F
      // Plus existing queue: G
      // Expected: [D, E, F, G]

      expect(setQueueCall.length).toBe(4);
      expect(setQueueCall.map((t: AudioTrack) => t.id)).toEqual(['d', 'e', 'f', 'g']);

      // History should now be [B, A] (tracks older than C)
      expect(component.history.length).toBe(2);
      expect(component.history.map((t) => t.id)).toEqual(['b', 'a']);
    });

    /**
     * BUG FIX TEST: Verify that the skipNextHistoryUpdate flag is set
     * This prevents the effect from re-adding the old current track to history
     */
    it('should set skipNextHistoryUpdate flag to prevent effect from corrupting history', () => {
      component.history = [trackC, trackB, trackA];
      mockAudioService._trackSignal.set(trackD);
      mockAudioService._queueSignal.set([trackE]);

      // Before: skipNextHistoryUpdate should be false
      // Access private property for testing using bracket notation
      expect((component as unknown as { skipNextHistoryUpdate: boolean }).skipNextHistoryUpdate).toBe(false);

      component.playFromHistory(trackB);

      // After: skipNextHistoryUpdate should be true (set before play() is called)
      // This will be reset to false when the effect runs
      expect((component as unknown as { skipNextHistoryUpdate: boolean }).skipNextHistoryUpdate).toBe(true);

      // History should only contain A, not D (the old current track)
      expect(component.history.length).toBe(1);
      expect(component.history[0].id).toBe('a');
    });
  });

  describe('getHistoryReversed', () => {
    it('should return history in reverse order (oldest first)', () => {
      // History: [D (most recent), C, B, A (oldest)]
      component.history = [trackD, trackC, trackB, trackA];

      const reversed = component.getHistoryReversed();

      // Should be [A, B, C, D] for display (oldest at top)
      expect(reversed[0].id).toBe('a');
      expect(reversed[1].id).toBe('b');
      expect(reversed[2].id).toBe('c');
      expect(reversed[3].id).toBe('d');
    });

    it('should not mutate the original history array', () => {
      component.history = [trackC, trackB, trackA];

      component.getHistoryReversed();

      // Original should still be [C, B, A]
      expect(component.history[0].id).toBe('c');
      expect(component.history[1].id).toBe('b');
      expect(component.history[2].id).toBe('a');
    });
  });

  describe('playFromQueue - skipping ahead in queue', () => {
    /**
     * BUG REPRODUCTION: When clicking on a track in the queue that's 2+ positions ahead,
     * the tracks between the current and clicked track disappear.
     *
     * Scenario:
     * - History: [A, B, C] (A oldest, C most recent)
     * - Current: D
     * - Queue: [E, F, G] (E plays next)
     * - User clicks on G (skipping E and F)
     *
     * Expected after clicking G:
     * - G plays
     * - History: [A, B, C, D, E, F] (D, E, F added to history)
     * - Queue: [] (empty, G was last)
     *
     * BUG behavior:
     * - History: [A, B, C, D] (E and F disappear!)
     */
    it('should add skipped queue tracks to history when jumping ahead in queue', () => {
      // Setup: History [C, B, A] (C most recent), Current D, Queue [E, F, G]
      component.history = [trackC, trackB, trackA];
      mockAudioService._trackSignal.set(trackD);
      mockAudioService._queueSignal.set([trackE, trackF, trackG]);

      // User clicks on G (index 2 in queue, skipping E and F)
      component.playFromQueue('g');

      // D (current), E, F should be added to history
      // History should now be [F, E, D, C, B, A] (F most recent, added in order)
      expect(component.history.length).toBe(6);
      expect(component.history[0].id).toBe('f'); // Most recently skipped
      expect(component.history[1].id).toBe('e'); // Skipped before F
      expect(component.history[2].id).toBe('d'); // Was current
      expect(component.history[3].id).toBe('c'); // Original history
      expect(component.history[4].id).toBe('b');
      expect(component.history[5].id).toBe('a');

      // skipToTrack should be called
      expect(mockAudioService.skipToTrack).toHaveBeenCalledWith('g');
    });

    /**
     * When clicking the next track in queue (no skipping), only current track goes to history
     */
    it('should add only current track to history when clicking next in queue', () => {
      component.history = [trackB, trackA];
      mockAudioService._trackSignal.set(trackC);
      mockAudioService._queueSignal.set([trackD, trackE]);

      // User clicks D (next in queue, no skipping)
      component.playFromQueue('d');

      // Only C should be added to history
      expect(component.history.length).toBe(3);
      expect(component.history[0].id).toBe('c'); // Was current
      expect(component.history[1].id).toBe('b');
      expect(component.history[2].id).toBe('a');

      expect(mockAudioService.skipToTrack).toHaveBeenCalledWith('d');
    });

    /**
     * When there's no current track, skipped queue items should still be added to history
     */
    it('should add skipped tracks to history even when no current track', () => {
      component.history = [trackA];
      mockAudioService._trackSignal.set(null);
      mockAudioService._queueSignal.set([trackB, trackC, trackD]);

      // User clicks D (skipping B and C)
      component.playFromQueue('d');

      // B and C should be added to history (no current track to add)
      expect(component.history.length).toBe(3);
      expect(component.history[0].id).toBe('c');
      expect(component.history[1].id).toBe('b');
      expect(component.history[2].id).toBe('a');

      expect(mockAudioService.skipToTrack).toHaveBeenCalledWith('d');
    });
  });
});
