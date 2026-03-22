// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../environments/environment';

export interface PublicArticle {
  id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description?: string;
  excerpt?: string;
  content?: string;
  status: string;
  isFeatured?: boolean;
  featuredImage?: string;
  featuredImageAlt?: string;
  viewCount: number;
  readTimeMinutes?: number;
  wordCount?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
  blog?: {
    id: string;
    name: string;
    slug: string;
  };
  author?: {
    id: string;
    username: string;
    displayName?: string;
  };
  // SEO fields (only in detail response)
  metaTitle?: string;
  metaKeywords?: string;
  canonicalUrl?: string;
  // Source episode (if generated from podcast)
  sourceEpisode?: {
    id: string;
    title: string;
  };
}

export interface PublicBlog {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  websiteUrl?: string;
  ownerName?: string;
  ownerLink?: string;
  articleCount?: number;
  viewCount: number;
  latestArticleDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogResponse extends PublicBlog {
  articles: PublicArticle[];
  pagination: {
    page: number;
    perPage: number;
    totalArticles: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
    nextPage?: number;
    previousPage?: number;
  };
}

export interface ArticleResponse extends PublicArticle {
  blogId: string;
  blogName: string;
  blogSlug: string;
  blog?: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    thumbnailUrl?: string;
  };
}

interface ArticleApiResponse extends PublicArticle {
  blog: {
    id: string;
    name: string;
    slug: string;
    imageUrl?: string;
    thumbnailUrl?: string;
  };
}

export interface BlogsListResponse {
  blogs: PublicBlog[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PublicBlogHttpService {
  private apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  getBlog(blogId: string, page = 1, perPage = 20): Observable<BlogResponse> {
    let params = new HttpParams();
    if (page > 1) params = params.set('page', page.toString());
    if (perPage !== 20) params = params.set('per_page', perPage.toString());
    return this.http.get<BlogResponse>(`${this.apiUrl}/blogs/${blogId}/`, { params });
  }

  getArticle(articleId: string): Observable<ArticleResponse> {
    return this.http.get<ArticleApiResponse>(`${this.apiUrl}/articles/${articleId}/`).pipe(
      map(
        (response): ArticleResponse => ({
          id: response.id,
          title: response.title,
          slug: response.slug,
          subtitle: response.subtitle,
          description: response.description,
          excerpt: response.excerpt,
          content: response.content,
          status: response.status,
          isFeatured: response.isFeatured,
          viewCount: response.viewCount,
          readTimeMinutes: response.readTimeMinutes,
          publishedAt: response.publishedAt,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          blogId: response.blog.id,
          blogName: response.blog.name,
          blogSlug: response.blog.slug,
          blog: response.blog,
        }),
      ),
    );
  }

  getBlogs(limit = 20): Observable<BlogsListResponse> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<BlogsListResponse>(`${this.apiUrl}/blogs/`, { params });
  }

  getArticles(
    limit = 20,
    sort: 'views' | 'recent' = 'views',
  ): Observable<{ articles: PublicArticle[]; total: number }> {
    let params = new HttpParams().set('limit', limit.toString());
    if (sort !== 'views') {
      params = params.set('sort', sort);
    }
    return this.http.get<{ articles: PublicArticle[]; total: number }>(`${this.apiUrl}/articles/`, { params });
  }
}

