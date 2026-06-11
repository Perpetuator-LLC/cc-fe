// Copyright (c) 2026 Perpetuator LLC
import { Pulse } from '../../pulses.types';
import { PulseStatusTextPipe } from './pulse-status-text.pipe';

describe('PulseStatusTextPipe', () => {
  const pipe = new PulseStatusTextPipe();

  it('title-cases terminal statuses', () => {
    expect(pipe.transform({ status: 'READY' } as Pulse)).toBe('Ready');
    expect(pipe.transform({ status: 'FAILED' } as Pulse)).toBe('Failed');
  });

  it('uses the time-aware label for queued pulses', () => {
    const pending = { status: 'PENDING', createdAt: new Date().toISOString() } as Pulse;
    expect(pipe.transform(pending)).toBe('Queued');
  });
});
