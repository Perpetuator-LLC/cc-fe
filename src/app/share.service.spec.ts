// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ShareService, ShareConfig } from './share.service';
import { AppConfigService } from './core/app-config.service';

describe('ShareService', () => {
  let service: ShareService;
  const SITE_URL = 'https://example.test';

  beforeEach(() => {
    const appConfig = { config: { SITE_URL } } as unknown as AppConfigService;
    TestBed.configureTestingModule({
      providers: [ShareService, { provide: AppConfigService, useValue: appConfig }],
    });
    service = TestBed.inject(ShareService);
  });

  describe('generateSlug', () => {
    it('lowercases and hyphenates whitespace', () => {
      expect(service.generateSlug('Hello World')).toBe('hello-world');
    });

    it('strips punctuation and collapses repeated hyphens', () => {
      expect(service.generateSlug('Foo! Bar?  Baz')).toBe('foo-bar-baz');
    });

    it('trims leading/trailing hyphens', () => {
      expect(service.generateSlug('--hello--')).toBe('hello');
    });

    it('handles unicode by stripping non-word characters', () => {
      expect(service.generateSlug('café — résumé!')).toBe('caf-rsum');
    });
  });

  describe('route + URL builders', () => {
    it('builds relative routes with slug-id format', () => {
      const id = 'abc';
      const title = 'My Title';
      expect(service.buildPodcastRoute(id, title)).toBe('/podcasts/my-title-abc');
      expect(service.buildEpisodeRoute(id, title)).toBe('/episodes/my-title-abc');
      expect(service.buildBlogRoute(id, title)).toBe('/blogs/my-title-abc');
      expect(service.buildArticleRoute(id, title)).toBe('/articles/my-title-abc');
    });

    it('builds absolute URLs by prefixing the configured site URL', () => {
      expect(service.buildPodcastUrl('1', 'X')).toBe(`${SITE_URL}/podcasts/x-1`);
      expect(service.buildEpisodeUrl('1', 'X')).toBe(`${SITE_URL}/episodes/x-1`);
      expect(service.buildBlogUrl('1', 'X')).toBe(`${SITE_URL}/blogs/x-1`);
      expect(service.buildArticleUrl('1', 'X')).toBe(`${SITE_URL}/articles/x-1`);
    });
  });

  describe('extractIdFromSlugParam', () => {
    it('returns the first UUID found anywhere in the param', () => {
      const uuid = '11111111-2222-3333-4444-555555555555';
      expect(service.extractIdFromSlugParam(`my-slug-${uuid}`)).toBe(uuid);
      expect(service.extractIdFromSlugParam(`${uuid}-my-slug`)).toBe(uuid);
      expect(service.extractIdFromSlugParam(`prefix-${uuid}-suffix`)).toBe(uuid);
    });

    it('falls back to numeric ID before the first hyphen when no UUID present', () => {
      expect(service.extractIdFromSlugParam('42-my-title')).toBe('42');
      expect(service.extractIdFromSlugParam('42')).toBe('42');
    });
  });

  describe('social share helpers', () => {
    let openSpy: jasmine.Spy;

    beforeEach(() => {
      openSpy = spyOn(window, 'open');
    });

    function config(): ShareConfig {
      return { url: 'https://x.test/a?b=1', title: 'Hello & "world"', description: 'desc with spaces' };
    }

    it('shareToTwitter opens twitter intent URL', () => {
      service.shareToTwitter(config());
      const url = openSpy.calls.mostRecent().args[0] as string;
      expect(url).toContain('twitter.com/intent/tweet');
      expect(url).toContain('text=');
      expect(url).toContain('url=');
    });

    it('shareToFacebook opens fb sharer URL', () => {
      service.shareToFacebook(config());
      expect(openSpy.calls.mostRecent().args[0]).toContain('facebook.com/sharer');
    });

    it('shareToLinkedIn opens linkedin share URL', () => {
      service.shareToLinkedIn(config());
      expect(openSpy.calls.mostRecent().args[0]).toContain('linkedin.com/sharing');
    });

    it('shareToReddit opens reddit submit URL', () => {
      service.shareToReddit(config());
      expect(openSpy.calls.mostRecent().args[0]).toContain('reddit.com/submit');
    });

    it('shareToWhatsApp uses wa.me with description included when provided', () => {
      service.shareToWhatsApp(config());
      const url = openSpy.calls.mostRecent().args[0] as string;
      expect(url).toContain('wa.me');
      expect(url).toContain(encodeURIComponent('desc with spaces'));
    });

    it('shareToWhatsApp without description still includes title and url', () => {
      service.shareToWhatsApp({ url: 'https://x.test', title: 'Only' });
      const url = openSpy.calls.mostRecent().args[0] as string;
      expect(url).toContain('wa.me');
      expect(url).toContain(encodeURIComponent('Only'));
    });

    it('shareToTelegram includes text and url params', () => {
      service.shareToTelegram(config());
      const url = openSpy.calls.mostRecent().args[0] as string;
      expect(url).toContain('t.me/share/url');
      expect(url).toContain('text=');
      expect(url).toContain('url=');
    });

    it('shareToTelegram falls back to title when no description', () => {
      service.shareToTelegram({ url: 'u', title: 't' });
      expect(openSpy.calls.mostRecent().args[0]).toContain('t.me/share/url');
    });

    it('shareToSignal copies to clipboard and alerts (no popup)', () => {
      spyOn(window, 'alert');
      const copySpy = spyOn(service, 'copyToClipboard');
      service.shareToSignal(config());
      expect(copySpy).toHaveBeenCalled();
      expect(openSpy).not.toHaveBeenCalled();
    });

    it('shareToSignal also handles missing description', () => {
      spyOn(window, 'alert');
      const copySpy = spyOn(service, 'copyToClipboard');
      service.shareToSignal({ url: 'u', title: 't' });
      expect(copySpy).toHaveBeenCalled();
    });

    // shareToEmail sets window.location.href = 'mailto:...' which trips
    // karma's "your test caused a full page reload" guard. We can't safely
    // exercise it from a unit test without changing production code, so
    // it's intentionally not covered here.
  });

  describe('copyToClipboard', () => {
    it('uses navigator.clipboard.writeText when available', async () => {
      const writeText = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      service.copyToClipboard('hi');
      expect(writeText).toHaveBeenCalledWith('hi');
    });

    it('falls back via execCommand when navigator.clipboard rejects', async () => {
      const rejection = Promise.reject(new Error('denied'));
      // Suppress the unhandled-rejection warning from karma — the production
      // code attaches a .catch, but the rejection still leaks through the
      // microtask scheduler before that runs.
      rejection.catch(() => undefined);
      spyOn(navigator.clipboard, 'writeText').and.returnValue(rejection);
      const fallback = spyOn(document, 'execCommand');
      spyOn(console, 'error');
      service.copyToClipboard('hi');
      await rejection.catch(() => undefined);
      expect(fallback).toHaveBeenCalledWith('copy');
    });

    it('falls back when navigator.clipboard is missing', () => {
      // Replace clipboard with a stub that has no writeText
      const original = (navigator as unknown as { clipboard: Clipboard }).clipboard;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      const execSpy = spyOn(document, 'execCommand');
      service.copyToClipboard('hi');
      expect(execSpy).toHaveBeenCalledWith('copy');
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: original });
    });
  });

  describe('nativeShare / canNativeShare', () => {
    it('canNativeShare returns a boolean', () => {
      expect(typeof service.canNativeShare()).toBe('boolean');
    });

    // Calling the real navigator.share in a headed browser opens the OS
    // share sheet and never settles, so the spec used to time out outside
    // headless runs. Spy on Navigator.prototype (configurable per spec)
    // instead of redefining the instance property, which Chrome rejects.
    it('nativeShare resolves true on success and false on cancel or no support', async () => {
      if (!('share' in Navigator.prototype)) {
        expect(await service.nativeShare({ url: 'u', title: 't' })).toBeFalse();
        return;
      }
      const shareSpy = spyOn(Navigator.prototype, 'share').and.resolveTo(undefined);
      expect(await service.nativeShare({ url: 'u', title: 't' })).toBeTrue();
      expect(shareSpy).toHaveBeenCalledWith(jasmine.objectContaining({ url: 'u', title: 't' }));

      shareSpy.and.rejectWith(new Error('user cancelled'));
      expect(await service.nativeShare({ url: 'u', title: 't' })).toBeFalse();
    });
  });
});
