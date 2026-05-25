// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { PublicBlogHttpService, PublicArticle, PublicBlog } from './public-blog-http.service';
import { AppConfigService } from './core/app-config.service';

const API_URL = 'https://api.test';

function blog(over: Partial<PublicBlog> = {}): PublicBlog {
  return {
    id: 'b1',
    name: 'Blog',
    slug: 'blog',
    viewCount: 0,
    ...over,
  };
}

function article(over: Partial<PublicArticle> = {}): PublicArticle {
  return {
    id: 'a1',
    title: 'Article',
    slug: 'article',
    status: 'PUBLISHED',
    viewCount: 0,
    createdAt: '2026-01-01T00:00:00Z',
    ...over,
  };
}

describe('PublicBlogHttpService', () => {
  let service: PublicBlogHttpService;
  let http: HttpTestingController;

  beforeEach(() => {
    const appConfig = { config: { API_URL } } as unknown as AppConfigService;
    TestBed.configureTestingModule({
      providers: [
        PublicBlogHttpService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: appConfig },
      ],
    });
    service = TestBed.inject(PublicBlogHttpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  describe('getBlog', () => {
    it('forkJoins blog + articles and computes pagination metadata for page 1', (done) => {
      service.getBlog('b1').subscribe((response) => {
        expect(response.id).toBe('b1');
        expect(response.articles.length).toBe(2);
        expect(response.pagination.page).toBe(1);
        expect(response.pagination.perPage).toBe(20);
        expect(response.pagination.totalArticles).toBe(40);
        expect(response.pagination.totalPages).toBe(2);
        expect(response.pagination.hasNext).toBeTrue();
        expect(response.pagination.hasPrevious).toBeFalse();
        expect(response.pagination.nextPage).toBe(2);
        expect(response.pagination.previousPage).toBeUndefined();
        done();
      });
      http.expectOne(`${API_URL}/blogs/b1/`).flush(blog());
      const req = http.expectOne((r) => r.url === `${API_URL}/articles/`);
      // page 1 → no offset param
      expect(req.request.params.get('offset')).toBeNull();
      expect(req.request.params.get('limit')).toBe('20');
      expect(req.request.params.get('blog')).toBe('b1');
      expect(req.request.params.get('sort')).toBe('recent');
      req.flush({ articles: [article(), article({ id: 'a2' })], total: 40, limit: 20 });
    });

    it('passes offset for page 2+ and reports hasPrevious + previousPage', (done) => {
      service.getBlog('b1', 2, 10).subscribe((response) => {
        expect(response.pagination.hasPrevious).toBeTrue();
        expect(response.pagination.previousPage).toBe(1);
        // totalArticles 15, perPage 10 -> totalPages 2; page 2 has no next
        expect(response.pagination.hasNext).toBeFalse();
        expect(response.pagination.nextPage).toBeUndefined();
        done();
      });
      http.expectOne(`${API_URL}/blogs/b1/`).flush(blog());
      const req = http.expectOne((r) => r.url === `${API_URL}/articles/`);
      expect(req.request.params.get('offset')).toBe('10');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ articles: [article()], total: 15, limit: 10 });
    });

    it('handles missing articles array gracefully', (done) => {
      service.getBlog('b1').subscribe((response) => {
        expect(response.articles).toEqual([]);
        expect(response.pagination.totalArticles).toBe(0);
        expect(response.pagination.totalPages).toBe(0);
        done();
      });
      http.expectOne(`${API_URL}/blogs/b1/`).flush(blog());
      // total missing -> falls back to 0; articles missing -> []
      http
        .expectOne((r) => r.url === `${API_URL}/articles/`)
        .flush({ articles: undefined as unknown as PublicArticle[], total: undefined as unknown as number, limit: 20 });
    });
  });

  describe('getArticle', () => {
    it('maps the API response into the ArticleResponse shape', (done) => {
      service.getArticle('a1').subscribe((response) => {
        expect(response.id).toBe('a1');
        expect(response.blogId).toBe('b1');
        expect(response.blogName).toBe('Blog');
        expect(response.blogSlug).toBe('blog');
        expect(response.blog).toEqual(jasmine.objectContaining({ id: 'b1' }));
        done();
      });
      http.expectOne(`${API_URL}/articles/a1/`).flush({ ...article(), blog: { id: 'b1', name: 'Blog', slug: 'blog' } });
    });
  });

  describe('getBlogs', () => {
    it('passes the default limit and returns the list', (done) => {
      service.getBlogs().subscribe((response) => {
        expect(response.total).toBe(3);
        expect(response.blogs.length).toBe(3);
        done();
      });
      const req = http.expectOne((r) => r.url === `${API_URL}/blogs/`);
      expect(req.request.params.get('limit')).toBe('20');
      req.flush({ blogs: [blog(), blog({ id: 'b2' }), blog({ id: 'b3' })], total: 3 });
    });

    it('honors a custom limit', (done) => {
      service.getBlogs(5).subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${API_URL}/blogs/`);
      expect(req.request.params.get('limit')).toBe('5');
      req.flush({ blogs: [], total: 0 });
    });
  });

  describe('getArticles', () => {
    it('omits sort param when default "views" is used', (done) => {
      service.getArticles().subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${API_URL}/articles/`);
      expect(req.request.params.get('sort')).toBeNull();
      expect(req.request.params.get('limit')).toBe('20');
      req.flush({ articles: [], total: 0 });
    });

    it('sets sort=recent when requested', (done) => {
      service.getArticles(10, 'recent').subscribe(() => done());
      const req = http.expectOne((r) => r.url === `${API_URL}/articles/`);
      expect(req.request.params.get('sort')).toBe('recent');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ articles: [], total: 0 });
    });
  });
});
