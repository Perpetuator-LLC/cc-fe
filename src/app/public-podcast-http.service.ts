// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface PublicEpisode {
  id: string;
  title: string;
  description: string;
  slug: string;
  audio_url: string;
  published_date: string;
  duration?: number;
}

export interface PublicPodcast {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  owner_name: string;
  owner_email: string;
  categories: Record<string, string[]>;
  view_count: number;
}

export interface PodcastResponse extends PublicPodcast {
  episodes: PublicEpisode[];
  page: number;
  per_page: number;
  total_episodes: number;
  total_pages: number;
}

export interface EpisodeResponse extends PublicEpisode {
  podcast_id: string;
  podcast_name: string;
  podcast_slug: string;
  content?: string;
  transcript?: string;
}

export interface PodcastsListResponse {
  podcasts: PublicPodcast[];
  total: number;
}

export interface Category {
  name: string;
  subcategories: string[];
  podcast_count: number;
}

export interface CategoriesResponse {
  categories: Record<string, Category>;
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
  private apiUrl = environment.API_URL;

  constructor(private http: HttpClient) {}

  getPodcast(podcastId: string, page = 1, perPage = 20): Observable<PodcastResponse> {
    let params = new HttpParams();
    if (page > 1) params = params.set('page', page.toString());
    if (perPage !== 20) params = params.set('per_page', perPage.toString());
    return this.http.get<PodcastResponse>(`${this.apiUrl}/podcasts/${podcastId}/`, { params });
  }

  getEpisode(episodeId: string): Observable<EpisodeResponse> {
    return this.http.get<EpisodeResponse>(`${this.apiUrl}/episodes/${episodeId}/`);
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
