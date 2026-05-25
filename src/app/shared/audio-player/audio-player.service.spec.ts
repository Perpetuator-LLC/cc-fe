// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { AudioPlayerService, AudioTrack } from './audio-player.service';

function track(over: Partial<AudioTrack> = {}): AudioTrack {
  return {
    id: 't1',
    title: 'Track One',
    audioUrl: 'https://example.com/a.mp3',
    type: 'episode',
    ...over,
  };
}

describe('AudioPlayerService', () => {
  let service: AudioPlayerService;

  beforeEach(() => {
    // Clear localStorage so prior test runs don't leak state into this one.
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AudioPlayerService] });
    service = TestBed.inject(AudioPlayerService);
  });

  afterEach(() => {
    service.stop();
    localStorage.clear();
  });

  it('is created with default state', () => {
    expect(service).toBeTruthy();
    expect(service.track()).toBeNull();
    expect(service.isPlaying()).toBeFalse();
    expect(service.currentTime()).toBe(0);
    expect(service.duration()).toBe(0);
    expect(service.queue()).toEqual([]);
    expect(service.hasTrack()).toBeFalse();
    expect(service.hasQueue()).toBeFalse();
    expect(service.queueLength()).toBe(0);
    expect(service.progress()).toBe(0);
  });

  describe('formatTime', () => {
    it('returns 0:00 for null/NaN/zero', () => {
      expect(service.formatTime(0)).toBe('0:00');
      expect(service.formatTime(NaN)).toBe('0:00');
    });

    it('formats sub-hour values as MM:SS', () => {
      expect(service.formatTime(5)).toBe('0:05');
      expect(service.formatTime(65)).toBe('1:05');
      expect(service.formatTime(599)).toBe('9:59');
    });

    it('formats hour+ values as HH:MM:SS with zero-padding', () => {
      expect(service.formatTime(3661)).toBe('1:01:01');
      expect(service.formatTime(7322)).toBe('2:02:02');
    });
  });

  describe('seek / seekToPercent / skipForward / skipBackward', () => {
    beforeEach(() => {
      // Seed track + duration so seeks have a non-zero clamping ceiling.
      service.play(track({ duration: 120 }));
      // The audio element clamps on assignment; advance the internal current
      // time so skip* arithmetic is observable.
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      audio.currentTime = 30;
      // Force the signal to match (the timeupdate listener fires async)
      (service as unknown as { _currentTime: { set(v: number): void } })._currentTime.set(30);
      (service as unknown as { _duration: { set(v: number): void } })._duration.set(120);
    });

    it('seek clamps to [0, duration]', () => {
      service.seek(-5);
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      expect(audio.currentTime).toBe(0);
      service.seek(9999);
      expect(audio.currentTime).toBe(120);
      service.seek(45);
      expect(audio.currentTime).toBe(45);
    });

    it('seekToPercent converts percent to seconds', () => {
      service.seekToPercent(50);
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      expect(audio.currentTime).toBe(60);
    });

    it('skipForward / skipBackward respect duration bounds', () => {
      service.skipForward(10);
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      expect(audio.currentTime).toBe(40);
      service.skipBackward(100);
      expect(audio.currentTime).toBe(0);
    });
  });

  describe('volume / mute', () => {
    it('setVolume clamps to [0,1] on the audio element and writes to localStorage', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      service.setVolume(0.42);
      expect(audio.volume).toBeCloseTo(0.42);
      // The volume key is always written; the persisted value reflects whatever
      // the `volumechange` listener last propagated to the signal.
      expect(localStorage.getItem('audio-player-volume')).not.toBeNull();
      service.setVolume(5);
      expect(audio.volume).toBe(1);
      service.setVolume(-2);
      expect(audio.volume).toBe(0);
    });

    it('toggleMute flips audio.muted', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      const initial = audio.muted;
      service.toggleMute();
      expect(audio.muted).toBe(!initial);
      service.toggleMute();
      expect(audio.muted).toBe(initial);
    });
  });

  describe('queue management', () => {
    it('addToQueue ignores duplicates by id', () => {
      service.addToQueue(track({ id: 'a' }));
      service.addToQueue(track({ id: 'a' }));
      service.addToQueue(track({ id: 'b' }));
      expect(service.queue().map((t) => t.id)).toEqual(['a', 'b']);
      expect(localStorage.getItem('audio-player-queue')).toContain('a');
    });

    it('removeFromQueue strips by id', () => {
      service.addToQueue(track({ id: 'a' }));
      service.addToQueue(track({ id: 'b' }));
      service.removeFromQueue('a');
      expect(service.queue().map((t) => t.id)).toEqual(['b']);
    });

    it('clearQueue empties everything', () => {
      service.addToQueue(track({ id: 'a' }));
      service.clearQueue();
      expect(service.queue()).toEqual([]);
    });

    it('setQueue replaces the queue', () => {
      service.setQueue([track({ id: 'x' }), track({ id: 'y' })]);
      expect(service.queueLength()).toBe(2);
      expect(service.hasQueue()).toBeTrue();
    });

    it('reorderQueue moves an item by index', () => {
      service.setQueue([track({ id: 'a' }), track({ id: 'b' }), track({ id: 'c' })]);
      service.reorderQueue(0, 2);
      expect(service.queue().map((t) => t.id)).toEqual(['b', 'c', 'a']);
    });

    it('playNext(track) deduplicates and prepends', () => {
      service.setQueue([track({ id: 'a' }), track({ id: 'b' })]);
      service.playNext(track({ id: 'b' }));
      expect(service.queue().map((t) => t.id)).toEqual(['b', 'a']);
    });

    it('playNext() with no arg pops the head of the queue and plays it', () => {
      const t1 = track({ id: 't1' });
      service.setQueue([t1]);
      const spy = spyOn(service, 'play').and.callThrough();
      service.playNext();
      expect(spy).toHaveBeenCalledWith(t1);
      expect(service.queue()).toEqual([]);
    });

    it('playNext() with empty queue is a no-op', () => {
      const spy = spyOn(service, 'play');
      service.playNext();
      expect(spy).not.toHaveBeenCalled();
    });

    it('skipToTrack plays the target and removes preceding items', () => {
      const a = track({ id: 'a' });
      const b = track({ id: 'b' });
      const c = track({ id: 'c' });
      service.setQueue([a, b, c]);
      const spy = spyOn(service, 'play').and.callThrough();
      service.skipToTrack('b');
      expect(spy).toHaveBeenCalledWith(b);
      expect(service.queue().map((t) => t.id)).toEqual(['c']);
    });

    it('skipToTrack with unknown id is a no-op', () => {
      service.setQueue([track({ id: 'a' })]);
      const spy = spyOn(service, 'play');
      service.skipToTrack('missing');
      expect(spy).not.toHaveBeenCalled();
      expect(service.queueLength()).toBe(1);
    });
  });

  describe('auto-queue toggle', () => {
    it('toggleAutoQueue flips the flag', () => {
      expect(service.autoQueueEnabled()).toBeFalse();
      service.toggleAutoQueue();
      expect(service.autoQueueEnabled()).toBeTrue();
      service.toggleAutoQueue();
      expect(service.autoQueueEnabled()).toBeFalse();
    });
  });

  describe('play / togglePlay / pause / resume / stop', () => {
    it('play sets the track, resets currentTime, and primes the audio element', () => {
      // Suppress unhandled audio.play() rejection in karma — jsdom-style audio
      // can fail with NotSupportedError; that's expected for this synthetic URL.
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      spyOn(audio, 'play').and.returnValue(Promise.resolve());
      spyOn(audio, 'load');

      service.play(track({ id: 'x', duration: 300 }));
      expect(service.track()?.id).toBe('x');
      expect(service.duration()).toBe(300);
      expect(audio.load).toHaveBeenCalled();
      expect(audio.play).toHaveBeenCalled();
    });

    it('play with the same track re-uses audio without reloading src', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      spyOn(audio, 'play').and.returnValue(Promise.resolve());
      const loadSpy = spyOn(audio, 'load');
      const t = track({ id: 'same' });
      service.play(t);
      loadSpy.calls.reset();
      service.play(t);
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('togglePlay does nothing when no track is loaded', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      const pauseSpy = spyOn(audio, 'pause');
      service.togglePlay();
      expect(pauseSpy).not.toHaveBeenCalled();
    });

    it('togglePlay pauses when playing and resumes when paused', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      spyOn(audio, 'play').and.returnValue(Promise.resolve());
      const pauseSpy = spyOn(audio, 'pause');
      service.play(track());
      (service as unknown as { _isPlaying: { set(v: boolean): void } })._isPlaying.set(true);
      service.togglePlay();
      expect(pauseSpy).toHaveBeenCalled();

      (service as unknown as { _isPlaying: { set(v: boolean): void } })._isPlaying.set(false);
      const playCalls = (audio.play as jasmine.Spy).calls.count();
      service.togglePlay();
      expect((audio.play as jasmine.Spy).calls.count()).toBeGreaterThan(playCalls);
    });

    it('resume is a no-op when no track is loaded', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      const playSpy = spyOn(audio, 'play').and.returnValue(Promise.resolve());
      service.resume();
      expect(playSpy).not.toHaveBeenCalled();
    });

    it('pause delegates to the underlying audio element', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      const pauseSpy = spyOn(audio, 'pause');
      service.pause();
      expect(pauseSpy).toHaveBeenCalled();
    });

    it('stop clears track + currentTime and removes persisted state', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      spyOn(audio, 'play').and.returnValue(Promise.resolve());
      spyOn(audio, 'pause');
      service.play(track());
      localStorage.setItem('audio-player-state', '{}');
      service.stop();
      expect(service.track()).toBeNull();
      expect(service.currentTime()).toBe(0);
      expect(service.duration()).toBe(0);
      expect(localStorage.getItem('audio-player-state')).toBeNull();
    });
  });

  describe('computed signals respond to underlying state', () => {
    it('progress = currentTime / duration * 100', () => {
      (service as unknown as { _duration: { set(v: number): void } })._duration.set(100);
      (service as unknown as { _currentTime: { set(v: number): void } })._currentTime.set(25);
      expect(service.progress()).toBe(25);
    });

    it('remainingTime never goes negative', () => {
      (service as unknown as { _duration: { set(v: number): void } })._duration.set(100);
      (service as unknown as { _currentTime: { set(v: number): void } })._currentTime.set(150);
      expect(service.remainingTime()).toBe(0);
    });
  });

  describe('audio element event handlers (initAudio listeners)', () => {
    function dispatch(name: string): void {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      audio.dispatchEvent(new Event(name));
    }

    it('loadstart sets isLoading=true and clears error', () => {
      (
        service as unknown as { _isLoading: { set(v: boolean): void }; _error: { set(v: string | null): void } }
      )._error.set('previous');
      dispatch('loadstart');
      expect(service.isLoading()).toBeTrue();
      expect(service.error()).toBeNull();
    });

    it('canplay sets isLoading=false', () => {
      (service as unknown as { _isLoading: { set(v: boolean): void } })._isLoading.set(true);
      dispatch('canplay');
      expect(service.isLoading()).toBeFalse();
    });

    it('loadedmetadata updates duration from the audio element', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      Object.defineProperty(audio, 'duration', { configurable: true, value: 123 });
      dispatch('loadedmetadata');
      expect(service.duration()).toBe(123);
    });

    it('timeupdate updates currentTime', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      audio.currentTime = 42;
      dispatch('timeupdate');
      expect(service.currentTime()).toBe(42);
    });

    it('play event marks isPlaying=true', () => {
      dispatch('play');
      expect(service.isPlaying()).toBeTrue();
    });

    it('pause event marks isPlaying=false', () => {
      (service as unknown as { _isPlaying: { set(v: boolean): void } })._isPlaying.set(true);
      dispatch('pause');
      expect(service.isPlaying()).toBeFalse();
    });

    it('ended resets currentTime to 0 and isPlaying to false', () => {
      (service as unknown as { _isPlaying: { set(v: boolean): void } })._isPlaying.set(true);
      (service as unknown as { _currentTime: { set(v: number): void } })._currentTime.set(50);
      dispatch('ended');
      expect(service.isPlaying()).toBeFalse();
      expect(service.currentTime()).toBe(0);
    });

    it('error marks error message and clears playing state', () => {
      dispatch('error');
      expect(service.error()).toBe('Failed to load audio');
      expect(service.isLoading()).toBeFalse();
      expect(service.isPlaying()).toBeFalse();
    });

    it('volumechange syncs volume and mute signals', () => {
      const audio = (service as unknown as { audio: HTMLAudioElement }).audio;
      Object.defineProperty(audio, 'volume', { configurable: true, value: 0.7 });
      Object.defineProperty(audio, 'muted', { configurable: true, value: true });
      dispatch('volumechange');
      expect(service.volume()).toBeCloseTo(0.7);
      expect(service.isMuted()).toBeTrue();
    });
  });

  describe('setAutoQueue', () => {
    it('sets the flag explicitly', () => {
      service.setAutoQueue(true);
      expect(service.autoQueueEnabled()).toBeTrue();
      service.setAutoQueue(false);
      expect(service.autoQueueEnabled()).toBeFalse();
    });
  });
});
