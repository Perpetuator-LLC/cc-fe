// Copyright (c) 2026 Perpetuator LLC
import { PulseAlertTypeIconPipe } from './pulse-alert-type-icon.pipe';

describe('PulseAlertTypeIconPipe', () => {
  const pipe = new PulseAlertTypeIconPipe();

  it('maps known alert types to icons', () => {
    expect(pipe.transform('breaking_news')).toBe('breaking_news');
    expect(pipe.transform('price_alert')).toBe('trending_up');
    expect(pipe.transform('earnings')).toBe('attach_money');
    expect(pipe.transform('sec_filing')).toBe('description');
  });

  it('falls back to the notifications icon', () => {
    expect(pipe.transform('unknown_type')).toBe('notifications');
  });
});
