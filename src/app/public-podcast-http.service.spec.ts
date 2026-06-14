// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PublicPodcastHttpService, PublicEpisode } from './public-podcast-http.service';
import { AppConfigService } from './core/app-config.service';

const API_URL = 'https://api.test';

function episode(over: Partial<PublicEpisode> = {}): PublicEpisode {
  return {
    id: 'e1',
    title: 'Episode',
    description: '',
    slug: 'episode',
    audioUrl: 'https://cdn.test/e1.mp3',
    date: '2026-01-01',
    ...over,
  };
}

describe('PublicPodcastHttpService', () => {
  let service: PublicPodcastHttpService;
  let http: HttpTestingController;

  beforeEach(() => {
    const appConfig = { config: { API_URL } } as unknown as AppConfigService;
    TestBed.configureTestingModule({
      providers: [
        PublicPodcastHttpService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: appConfig },
      ],
    });
    service = TestBed.inject(PublicPodcastHttpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('getPodcast', () => {
    it('omits default paging params', () => {
      service.getPodcast('p1').subscribe();
      const req = http.expectOne(`${API_URL}/podcasts/p1/`);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      req.flush({});
    });

    it('sends non-default page and per_page params', () => {
      service.getPodcast('p1', 3, 50).subscribe();
      const req = http.expectOne((r) => r.url === `${API_URL}/podcasts/p1/`);
      expect(req.request.params.get('page')).toBe('3');
      expect(req.request.params.get('per_page')).toBe('50');
      req.flush({});
    });
  });

  describe('getEpisode', () => {
    it('flattens the nested podcast into top-level fields', (done) => {
      service.getEpisode('e1').subscribe((response) => {
        expect(response.podcastId).toBe('p1');
        expect(response.podcastName).toBe('My Podcast');
        expect(response.podcastSlug).toBe('my-podcast');
        expect(response.title).toBe('Episode');
        expect(response.podcast?.imageUrl).toBe('https://cdn.test/img.png');
        done();
      });
      http.expectOne(`${API_URL}/episodes/e1/`).flush({
        ...episode(),
        podcast: { id: 'p1', name: 'My Podcast', slug: 'my-podcast', imageUrl: 'https://cdn.test/img.png' },
      });
    });
  });

  describe('getEpisodes', () => {
    it('omits default params and sends overrides', () => {
      service.getEpisodes().subscribe();
      http.expectOne(`${API_URL}/episodes/`).flush({ episodes: [], total: 0 });

      service.getEpisodes(5, 'recent').subscribe();
      const req = http.expectOne((r) => r.url === `${API_URL}/episodes/`);
      expect(req.request.params.get('limit')).toBe('5');
      expect(req.request.params.get('sort')).toBe('recent');
      req.flush({ episodes: [], total: 0 });
    });
  });

  describe('getPodcasts', () => {
    it('omits default params and sends overrides', () => {
      service.getPodcasts().subscribe();
      http.expectOne(`${API_URL}/podcasts/`).flush({ podcasts: [], total: 0 });

      service.getPodcasts(10, 'recent').subscribe();
      const req = http.expectOne((r) => r.url === `${API_URL}/podcasts/`);
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('sort')).toBe('recent');
      req.flush({ podcasts: [], total: 0 });
    });
  });

  it('getCategories hits the categories endpoint', () => {
    service.getCategories().subscribe();
    http.expectOne(`${API_URL}/podcast-categories/`).flush({ categories: [] });
  });

  describe('getPodcastsByCategory', () => {
    it('URL-encodes the category', () => {
      service.getPodcastsByCategory('News & Politics').subscribe();
      http
        .expectOne(`${API_URL}/podcast-category/News%20%26%20Politics/`)
        .flush({ category: 'News & Politics', podcasts: [], total: 0 });
    });

    it('includes the subcategory segment and limit param', () => {
      service.getPodcastsByCategory('Tech', 'AI/ML', 5).subscribe();
      const req = http.expectOne((r) => r.url === `${API_URL}/podcast-category/Tech/AI%2FML/`);
      expect(req.request.params.get('limit')).toBe('5');
      req.flush({ category: 'Tech', subcategory: 'AI/ML', podcasts: [], total: 0 });
    });
  });
});
