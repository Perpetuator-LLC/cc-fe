// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { Article, Blog, BlogsService } from './blogs.service';

function makeBlog(over: Partial<Blog> = {}): Blog {
  return {
    id: 'b1',
    name: 'Blog',
    slug: 'blog',
    description: null,
    tagline: null,
    image: null,
    thumbnail: null,
    prompt: '',
    status: 'ACTIVE',
    enabled: true,
    viewCount: 0,
    latestArticleDate: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    articleCount: 0,
    publishedArticleCount: 0,
    ...over,
  };
}

function makeArticle(over: Partial<Article> = {}): Article {
  return {
    id: 'a1',
    blog: { id: 'b1', name: 'Blog', slug: 'blog' },
    title: 'Article',
    slug: 'article',
    subtitle: null,
    description: null,
    content: 'hello',
    excerpt: null,
    featuredImage: null,
    featuredImageAlt: null,
    featuredImageCaption: null,
    status: 'DRAFT',
    isFeatured: false,
    currentVersionNumber: 1,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    publishedAt: null,
    scheduledPublishAt: null,
    viewCount: 0,
    readTimeMinutes: null,
    wordCount: null,
    isPublished: null,
    sourceContentType: null,
    sourceContentUuid: null,
    sourceEpisode: null,
    ...over,
  };
}

describe('BlogsService', () => {
  let service: BlogsService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    TestBed.configureTestingModule({
      providers: [BlogsService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(BlogsService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  // ---- Queries ----

  describe('queries', () => {
    it('getBlogs unwraps result.data.blogs', (done) => {
      const blogs = [makeBlog()];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { blogs } } as any));
      service.getBlogs('team-1').subscribe((result) => {
        expect(result).toEqual(blogs);
        expect(apollo.query).toHaveBeenCalled();
        const args = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['teamUuid']).toBe('team-1');
        done();
      });
    });

    it('getBlogs returns [] when result.data is empty', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: null } as any));
      service.getBlogs().subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('getBlog throws when result.data.blog is missing', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: null } as any));
      service.getBlog('b1').subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('Blog not found');
          done();
        },
      });
    });

    it('getBlog returns blog when present', (done) => {
      const blog = { ...makeBlog(), articles: [makeArticle()] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { blog } } as any));
      service.getBlog('b1').subscribe((result) => {
        expect(result.id).toBe('b1');
        expect(result.articles.length).toBe(1);
        done();
      });
    });

    it('getArticles unwraps result.data.articles', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { articles: [makeArticle()] } } as any));
      service.getArticles('blog-1', 'PUBLISHED', 10).subscribe((result) => {
        expect(result.length).toBe(1);
        const args = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables).toEqual({ blogUuid: 'blog-1', status: 'PUBLISHED', limit: 10 });
        done();
      });
    });

    it('getArticles returns [] when no data', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: null } as any));
      service.getArticles().subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('getArticle throws when missing', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: null } as any));
      service.getArticle('a1').subscribe({
        next: () => fail('should have errored'),
        error: (err) => {
          expect(err.message).toBe('Article not found');
          done();
        },
      });
    });

    it('getArticle returns the article when present', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { article: makeArticle() } } as any));
      service.getArticle('a1').subscribe((result) => {
        expect(result.id).toBe('a1');
        done();
      });
    });
  });

  // ---- Mutations ----

  describe('mutations', () => {
    function mockMutationSuccess(key: string, payload: Record<string, unknown>) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.mutate.and.returnValue(of({ data: { [key]: payload } } as any));
    }
    function mockMutationFailure() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.mutate.and.returnValue(of({ data: null } as any));
    }

    it('createBlog forwards variables and unwraps response', (done) => {
      mockMutationSuccess('createBlog', { success: true, blog: makeBlog() });
      service.createBlog('Name', 'team', { description: 'd', slug: 's', tagline: 't' }).subscribe((res) => {
        expect(res.success).toBeTrue();
        const args = apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables).toEqual({
          name: 'Name',
          teamUuid: 'team',
          description: 'd',
          slug: 's',
          tagline: 't',
        });
        done();
      });
    });

    it('createBlog throws when response missing', (done) => {
      mockMutationFailure();
      service.createBlog('n', 't').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to create blog');
          done();
        },
      });
    });

    it('updateBlog merges updates into variables', (done) => {
      mockMutationSuccess('updateBlog', { success: true, blog: makeBlog() });
      service.updateBlog('b1', { name: 'New' }).subscribe(() => {
        const args = apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['name']).toBe('New');
        expect(args.variables['blogUuid']).toBe('b1');
        done();
      });
    });

    it('updateBlog throws when response missing', (done) => {
      mockMutationFailure();
      service.updateBlog('b1', { name: 'x' }).subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to update blog');
          done();
        },
      });
    });

    it('createArticle / updateArticle pass through option fields', (done) => {
      mockMutationSuccess('createArticle', { success: true, article: makeArticle() });
      service.createArticle('b1', 't', 'c', { subtitle: 'sub' }).subscribe(() => {
        const args = apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['subtitle']).toBe('sub');
        done();
      });
    });

    it('createArticle throws on missing response', (done) => {
      mockMutationFailure();
      service.createArticle('b', 't', 'c').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to create article');
          done();
        },
      });
    });

    it('updateArticle merges updates correctly', (done) => {
      mockMutationSuccess('updateArticle', { success: true, article: makeArticle() });
      service.updateArticle('a1', { isFeatured: true }).subscribe(() => {
        const args = apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['isFeatured']).toBe(true);
        done();
      });
    });

    it('updateArticle throws on missing response', (done) => {
      mockMutationFailure();
      service.updateArticle('a1', { title: 'x' }).subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to update article');
          done();
        },
      });
    });

    it('publishArticle unwraps response', (done) => {
      mockMutationSuccess('publishArticle', { success: true });
      service.publishArticle('a1').subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('publishArticle throws on missing response', (done) => {
      mockMutationFailure();
      service.publishArticle('a1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to publish article');
          done();
        },
      });
    });

    it('unpublishArticle unwraps response', (done) => {
      mockMutationSuccess('unpublishArticle', { success: true });
      service.unpublishArticle('a1').subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('unpublishArticle throws on missing response', (done) => {
      mockMutationFailure();
      service.unpublishArticle('a1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to unpublish article');
          done();
        },
      });
    });

    it('deleteArticle returns success payload', (done) => {
      mockMutationSuccess('deleteArticle', { success: true });
      service.deleteArticle('a1').subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('deleteArticle throws on missing response', (done) => {
      mockMutationFailure();
      service.deleteArticle('a1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to delete article');
          done();
        },
      });
    });

    it('deleteBlog returns success payload', (done) => {
      mockMutationSuccess('deleteBlog', { success: true });
      service.deleteBlog('b1').subscribe((res) => {
        expect(res.success).toBeTrue();
        done();
      });
    });

    it('deleteBlog throws on missing response', (done) => {
      mockMutationFailure();
      service.deleteBlog('b1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to delete blog');
          done();
        },
      });
    });

    it('generateArticleFromSource passes options', (done) => {
      mockMutationSuccess('generateArticleFromSource', { success: true });
      service.generateArticleFromSource('episode', 'e1', { title: 'T', blogUuid: 'b1' }).subscribe((res) => {
        expect(res.success).toBeTrue();
        const args = apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables).toEqual({
          sourceType: 'episode',
          sourceUuid: 'e1',
          title: 'T',
          blogUuid: 'b1',
        });
        done();
      });
    });

    it('generateArticleFromSource throws on missing response', (done) => {
      mockMutationFailure();
      service.generateArticleFromSource('episode', 'e1').subscribe({
        error: (err) => {
          expect(err.message).toContain('Failed to generate article from source');
          done();
        },
      });
    });
  });
});
