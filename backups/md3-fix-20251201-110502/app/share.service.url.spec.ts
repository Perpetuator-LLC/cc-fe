// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ShareService } from './share.service';

describe('ShareService URL Generation', () => {
  let service: ShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareService);
  });

  describe('generateSlug', () => {
    it('should convert title to lowercase slug', () => {
      expect(service.generateSlug('My Awesome Podcast')).toBe('my-awesome-podcast');
    });

    it('should remove special characters', () => {
      expect(service.generateSlug('Tech & Science!')).toBe('tech-science');
    });

    it('should replace spaces with hyphens', () => {
      expect(service.generateSlug('The Ultimate Guide to AI')).toBe('the-ultimate-guide-to-ai');
    });

    it('should handle numbers', () => {
      expect(service.generateSlug('2024 Tech Trends')).toBe('2024-tech-trends');
    });

    it('should remove duplicate hyphens', () => {
      expect(service.generateSlug('Multiple   Spaces')).toBe('multiple-spaces');
    });

    it('should trim whitespace', () => {
      expect(service.generateSlug('  Trimmed  ')).toBe('trimmed');
    });
  });

  describe('buildPodcastRoute', () => {
    it('should build route with id and slug', () => {
      const route = service.buildPodcastRoute('123', 'My Podcast');
      expect(route).toBe('/podcasts/123-my-podcast');
    });

    it('should work with UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const route = service.buildPodcastRoute(uuid, 'Tech Podcast');
      expect(route).toBe(`/podcasts/${uuid}-tech-podcast`);
    });
  });

  describe('buildEpisodeRoute', () => {
    it('should build route with id and slug', () => {
      const route = service.buildEpisodeRoute('456', 'Episode Title');
      expect(route).toBe('/episodes/456-episode-title');
    });
  });

  describe('extractIdFromSlugParam', () => {
    it('should extract numeric ID from slug param', () => {
      expect(service.extractIdFromSlugParam('123-my-podcast')).toBe('123');
    });

    it('should extract UUID from slug param', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const param = `${uuid}-my-podcast`;
      expect(service.extractIdFromSlugParam(param)).toBe(uuid);
    });

    it('should handle UUID with long slug', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const param = `${uuid}-the-ultimate-guide-to-machine-learning`;
      expect(service.extractIdFromSlugParam(param)).toBe(uuid);
    });

    it('should handle numeric ID with hyphens in slug', () => {
      expect(service.extractIdFromSlugParam('789-tech-and-science')).toBe('789');
    });

    it('should handle ID without slug', () => {
      expect(service.extractIdFromSlugParam('123')).toBe('123');
    });

    it('should handle UUID without slug', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(service.extractIdFromSlugParam(uuid)).toBe(uuid);
    });
  });

  describe('buildPodcastUrl', () => {
    it('should build full URL with domain', () => {
      const url = service.buildPodcastUrl('123', 'My Podcast');
      expect(url).toContain('/podcasts/123-my-podcast');
      expect(url).toMatch(/^https?:\/\//);
    });
  });

  describe('buildEpisodeUrl', () => {
    it('should build full URL with domain', () => {
      const url = service.buildEpisodeUrl('456', 'Episode Title');
      expect(url).toContain('/episodes/456-episode-title');
      expect(url).toMatch(/^https?:\/\//);
    });
  });
});
