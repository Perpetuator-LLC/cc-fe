// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AppConfigService } from './core/app-config.service';

export interface PublicEpisode {
  id: string;
  title: string;
  description: string;
  slug: string;
  audioUrl: string;
  date: string;
  duration?: number;
  audioSeconds?: number;
  viewCount?: number;
  audioPlayCount?: number;
}

export interface PublicPodcast {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  ownerName: string;
  ownerEmail: string;
  ownerLink?: string;
  rssUrl?: string;
  episodeCount?: number;
  viewCount: number;
  rssLoadCount?: number;
  imageLoadCount?: number;
  thumbnailLoadCount?: number;
  createdAt?: string;
  updatedAt?: string;
  categories: Record<string, string[]>;
}

export interface PodcastResponse extends PublicPodcast {
  episodes: PublicEpisode[];
  pagination: {
    page: number;
    perPage: number;
    totalEpisodes: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
    nextPage?: number;
    previousPage?: number;
  };
}

export interface EpisodeResponse extends PublicEpisode {
  podcastId: string;
  podcastName: string;
  podcastSlug: string;
  content?: string;
  transcript?: string;
  podcast?: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    thumbnailUrl?: string;
  };
}

interface EpisodeApiResponse extends PublicEpisode {
  podcast: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    thumbnailUrl?: string;
  };
  content?: string;
  transcript?: string;
}

export interface PodcastsListResponse {
  podcasts: PublicPodcast[];
  total: number;
}

export interface Category {
  name?: string; // For backward compatibility
  category?: string; // What the API actually returns
  subcategories: string[];
  podcastCount: number;
}

export interface CategoriesResponse {
  categories: Record<string, Category> | Category[] | string[];
}

export interface CategoryPodcastsResponse {
  category: string;
  subcategory?: string;
  podcasts: PublicPodcast[];
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PublicPodcastHttpService {
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);

  private get apiUrl(): string {
    return this.appConfig.config.API_URL;
  }

  getPodcast(podcastId: string, page = 1, perPage = 20): Observable<PodcastResponse> {
    let params = new HttpParams();
    if (page > 1) params = params.set('page', page.toString());
    if (perPage !== 20) params = params.set('per_page', perPage.toString());
    return this.http.get<PodcastResponse>(`${this.apiUrl}/podcasts/${podcastId}/`, { params });
  }

  getEpisode(episodeId: string): Observable<EpisodeResponse> {
    return this.http.get<EpisodeApiResponse>(`${this.apiUrl}/episodes/${episodeId}/`).pipe(
      map(
        (response): EpisodeResponse => ({
          id: response.id,
          title: response.title,
          description: response.description,
          slug: response.slug,
          audioUrl: response.audioUrl,
          date: response.date,
          duration: response.duration,
          audioSeconds: response.audioSeconds,
          viewCount: response.viewCount,
          audioPlayCount: response.audioPlayCount,
          podcastId: response.podcast.id,
          podcastName: response.podcast.name,
          podcastSlug: response.podcast.slug,
          content: response.content,
          transcript: response.transcript,
          podcast: response.podcast,
        }),
      ),
    );
  }

  getEpisodes(
    limit = 20,
    sort: 'views' | 'plays' | 'recent' = 'views',
  ): Observable<{ episodes: PublicEpisode[]; total: number }> {
    let params = new HttpParams();
    if (limit !== 20) params = params.set('limit', limit.toString());
    if (sort !== 'views') params = params.set('sort', sort);
    return this.http.get<{ episodes: PublicEpisode[]; total: number }>(`${this.apiUrl}/episodes/`, { params });
  }

  getPodcasts(limit = 20, sort: 'views' | 'recent' = 'views'): Observable<PodcastsListResponse> {
    let params = new HttpParams();
    if (limit !== 20) params = params.set('limit', limit.toString());
    if (sort !== 'views') params = params.set('sort', sort);
    return this.http.get<PodcastsListResponse>(`${this.apiUrl}/podcasts/`, { params });
  }

  getCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${this.apiUrl}/podcast-categories/`);
  }

  getPodcastsByCategory(category: string, subcategory?: string, limit = 20): Observable<CategoryPodcastsResponse> {
    let params = new HttpParams();
    if (limit !== 20) params = params.set('limit', limit.toString());
    const url = subcategory
      ? `${this.apiUrl}/podcast-category/${encodeURIComponent(category)}/${encodeURIComponent(subcategory)}/`
      : `${this.apiUrl}/podcast-category/${encodeURIComponent(category)}/`;
    return this.http.get<CategoryPodcastsResponse>(url, { params });
  }
}
