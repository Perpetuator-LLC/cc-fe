// Copyright (c) 2026 Perpetuator LLC
import { Pulse } from '../../pulses.types';
import { PulseCanPlayPipe } from './pulse-can-play.pipe';

describe('PulseCanPlayPipe', () => {
  const pipe = new PulseCanPlayPipe();

  it('allows playback when audio exists and the pulse is READY or DELIVERED', () => {
    expect(pipe.transform({ audioUrl: 'https://a/b.mp3', status: 'READY' } as Pulse)).toBeTrue();
    expect(pipe.transform({ audioUrl: 'https://a/b.mp3', status: 'DELIVERED' } as Pulse)).toBeTrue();
  });

  it('blocks playback without audio or in non-terminal statuses', () => {
    expect(pipe.transform({ audioUrl: '', status: 'READY' } as Pulse)).toBeFalse();
    expect(pipe.transform({ audioUrl: 'https://a/b.mp3', status: 'GENERATING' } as Pulse)).toBeFalse();
    expect(pipe.transform({ audioUrl: 'https://a/b.mp3', status: 'FAILED' } as Pulse)).toBeFalse();
  });
});
