// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let meta: jasmine.SpyObj<Meta>;
  let title: jasmine.SpyObj<Title>;

  beforeEach(() => {
    meta = jasmine.createSpyObj<Meta>('Meta', ['updateTag']);
    title = jasmine.createSpyObj<Title>('Title', ['setTitle']);
    TestBed.configureTestingModule({
      providers: [SeoService, { provide: Meta, useValue: meta }, { provide: Title, useValue: title }],
    });
    service = TestBed.inject(SeoService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('updateTags', () => {
    it('merges defaults with overrides and sets title + og:title + twitter:title', () => {
      service.updateTags({ title: 'Custom Page' });
      expect(title.setTitle).toHaveBeenCalledWith('Custom Page');
      expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:title', content: 'Custom Page' });
      expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:title', content: 'Custom Page' });
    });

    it('sets description meta tags', () => {
      service.updateTags({ description: 'Hello world' });
      expect(meta.updateTag).toHaveBeenCalledWith({ name: 'description', content: 'Hello world' });
      expect(meta.updateTag).toHaveBeenCalledWith({ property: 'og:description', content: 'Hello world' });
      expect(meta.updateTag).toHaveBeenCalledWith({ name: 'twitter:description', content: 'Hello world' });
    });

    it('truncates long descriptions at word boundary with ellipsis', () => {
      const long =
        'The quick brown fox jumps over the lazy dog. ' +
        'The quick brown fox jumps over the lazy dog. ' +
        'The quick brown fox jumps over the lazy dog. ' +
        'The quick brown fox jumps over the lazy dog. ' +
        'The quick brown fox jumps over the lazy dog.';
      service.updateTags({ description: long });
      const descCall = meta.updateTag.calls
        .allArgs()
        .find((args) => (args[0] as { name?: string }).name === 'description');
      expect(descCall).toBeDefined();
      const content = (descCall![0] as { content: string }).content;
      expect(content.length).toBeLessThanOrEqual(200);
      expect(content.endsWith('...')).toBeTrue();
    });

    it('passes through short descriptions unchanged', () => {
      service.updateTags({ description: 'short' });
      const descCall = meta.updateTag.calls
        .allArgs()
        .find((args) => (args[0] as { name?: string }).name === 'description');
      expect((descCall![0] as { content: string }).content).toBe('short');
    });

    it('resolves relative image URLs against window.location.origin', () => {
      service.updateTags({ image: '/logo.png' });
      const ogImage = meta.updateTag.calls
        .allArgs()
        .find((args) => (args[0] as { property?: string }).property === 'og:image');
      const content = (ogImage![0] as { content: string }).content;
      expect(content).toContain(window.location.origin);
      expect(content).toContain('/logo.png');
    });

    it('preserves absolute image URLs', () => {
      service.updateTags({ image: 'https://cdn.test/img.png' });
      const ogImage = meta.updateTag.calls
        .allArgs()
        .find((args) => (args[0] as { property?: string }).property === 'og:image');
      expect((ogImage![0] as { content: string }).content).toBe('https://cdn.test/img.png');
    });

    it('handles relative image URLs without leading slash', () => {
      service.updateTags({ image: 'img.png' });
      const ogImage = meta.updateTag.calls
        .allArgs()
        .find((args) => (args[0] as { property?: string }).property === 'og:image');
      const content = (ogImage![0] as { content: string }).content;
      // The service inserts a '/' before the relative path
      expect(content).toMatch(/\/img\.png$/);
    });

    it('sets og:url, og:type, author, time tags, twitter:card', () => {
      service.updateTags({
        url: 'https://example.test',
        type: 'article',
        author: 'Jane',
        publishedTime: '2026-01-01',
        modifiedTime: '2026-01-02',
        twitterCard: 'summary',
      });
      const allCalls = meta.updateTag.calls.allArgs().map((args) => args[0] as Record<string, string>);
      expect(allCalls.some((c) => c['property'] === 'og:url')).toBeTrue();
      expect(allCalls.some((c) => c['property'] === 'og:type' && c['content'] === 'article')).toBeTrue();
      expect(allCalls.some((c) => c['name'] === 'author' && c['content'] === 'Jane')).toBeTrue();
      expect(allCalls.some((c) => c['property'] === 'article:published_time')).toBeTrue();
      expect(allCalls.some((c) => c['property'] === 'article:modified_time')).toBeTrue();
      expect(allCalls.some((c) => c['name'] === 'twitter:card' && c['content'] === 'summary')).toBeTrue();
    });

    it('sets audio tags when audio + audioType supplied', () => {
      service.updateTags({ audio: '/track.mp3', audioType: 'audio/mpeg' });
      const allCalls = meta.updateTag.calls.allArgs().map((args) => args[0] as Record<string, string>);
      expect(allCalls.some((c) => c['property'] === 'og:audio')).toBeTrue();
      expect(allCalls.some((c) => c['property'] === 'og:audio:secure_url')).toBeTrue();
      expect(allCalls.some((c) => c['property'] === 'og:audio:type' && c['content'] === 'audio/mpeg')).toBeTrue();
    });

    it('omits audio:type when only audio is supplied', () => {
      service.updateTags({ audio: '/track.mp3' });
      const allCalls = meta.updateTag.calls.allArgs().map((args) => args[0] as Record<string, string>);
      expect(allCalls.some((c) => c['property'] === 'og:audio')).toBeTrue();
      expect(allCalls.some((c) => c['property'] === 'og:audio:type')).toBeFalse();
    });

    it('always sets og:site_name', () => {
      service.updateTags({});
      const allCalls = meta.updateTag.calls.allArgs().map((args) => args[0] as Record<string, string>);
      expect(allCalls.some((c) => c['property'] === 'og:site_name')).toBeTrue();
    });
  });
});
