// Copyright (c) 2026 Perpetuator LLC
import { MediaTabPreferenceService } from './media-tab-preference.service';

describe('MediaTabPreferenceService', () => {
  const STORAGE_KEY = 'media-tab-preference';
  let service: MediaTabPreferenceService;

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    service = new MediaTabPreferenceService();
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
  });

  it('defaults to pulses when nothing is stored', () => {
    expect(service.getPreferredTab()).toBe('pulses');
  });

  it('round-trips a stored preference', () => {
    service.setPreferredTab('episodes');
    expect(service.getPreferredTab()).toBe('episodes');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-tab');
    expect(service.getPreferredTab()).toBe('pulses');
  });

  it('records visits to media routes', () => {
    service.recordTabVisit('/media/news');
    expect(service.getPreferredTab()).toBe('news');
    service.recordTabVisit('/media/socials?filter=x');
    expect(service.getPreferredTab()).toBe('socials');
  });

  it('ignores non-media routes', () => {
    service.setPreferredTab('topics');
    service.recordTabVisit('/terminal/chart');
    expect(service.getPreferredTab()).toBe('topics');
  });
});
