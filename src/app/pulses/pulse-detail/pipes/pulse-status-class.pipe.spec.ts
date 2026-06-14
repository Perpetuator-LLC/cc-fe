// Copyright (c) 2026 Perpetuator LLC
import { Pulse } from '../../pulses.types';
import { PulseStatusClassPipe } from './pulse-status-class.pipe';

describe('PulseStatusClassPipe', () => {
  const pipe = new PulseStatusClassPipe();

  it('maps pulse statuses to badge classes', () => {
    expect(pipe.transform({ status: 'READY' } as Pulse)).toBe('status-success');
    expect(pipe.transform({ status: 'FAILED' } as Pulse)).toBe('status-error');
  });

  it('uses the time-aware class for in-flight pulses', () => {
    const pending = { status: 'PENDING', createdAt: new Date().toISOString() } as Pulse;
    expect(pipe.transform(pending)).toBe('status-warning');
  });
});
