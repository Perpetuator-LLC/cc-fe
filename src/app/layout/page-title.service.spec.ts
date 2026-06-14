// Copyright (c) 2026 Perpetuator LLC
import { PageTitleService } from './page-title.service';

describe('PageTitleService', () => {
  let service: PageTitleService;

  beforeEach(() => {
    service = new PageTitleService();
  });

  it('starts with an empty title', () => {
    expect(service.title()).toBe('');
    expect(service.icon()).toBeUndefined();
    expect(service.breadcrumb()).toBeUndefined();
  });

  it('accepts a plain string title', () => {
    service.setTitle('Dashboard');
    expect(service.title()).toBe('Dashboard');
    expect(service.config()).toEqual({ title: 'Dashboard' });
  });

  it('accepts a full config with icon and breadcrumb', () => {
    service.setTitle({ title: 'My Podcast', icon: 'podcasts', breadcrumb: 'Podcasts' });
    expect(service.title()).toBe('My Podcast');
    expect(service.icon()).toBe('podcasts');
    expect(service.breadcrumb()).toBe('Podcasts');
  });

  it('clearTitle resets to the empty config', () => {
    service.setTitle({ title: 'Something', icon: 'home' });
    service.clearTitle();
    expect(service.title()).toBe('');
    expect(service.icon()).toBeUndefined();
  });
});
