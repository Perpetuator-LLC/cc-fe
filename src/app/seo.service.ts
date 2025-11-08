// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

export interface SeoConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'music.song';
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'player';
  audio?: string;
  audioType?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private defaultConfig: SeoConfig = {
    title: 'Capital Copilot - AI-Powered Podcast Platform',
    description:
      'Create, manage, and distribute podcasts with AI-powered tools. ' +
      'Discover amazing podcasts from our community.',
    image: '/Capital_Copilot_Logo_PFP.png',
    url: 'https://capitalcopilot.com',
    type: 'website',
    twitterCard: 'summary_large_image',
  };

  constructor(
    private meta: Meta,
    private titleService: Title,
  ) {}

  updateTags(config: SeoConfig): void {
    const finalConfig = { ...this.defaultConfig, ...config };

    // Update title
    if (finalConfig.title) {
      this.titleService.setTitle(finalConfig.title);
      this.meta.updateTag({ property: 'og:title', content: finalConfig.title });
      this.meta.updateTag({ name: 'twitter:title', content: finalConfig.title });
    }

    // Update description
    if (finalConfig.description) {
      this.meta.updateTag({ name: 'description', content: finalConfig.description });
      this.meta.updateTag({ property: 'og:description', content: finalConfig.description });
      this.meta.updateTag({ name: 'twitter:description', content: finalConfig.description });
    }

    // Update image
    if (finalConfig.image) {
      const imageUrl = this.getAbsoluteUrl(finalConfig.image);
      this.meta.updateTag({ property: 'og:image', content: imageUrl });
      this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    }

    // Update URL
    if (finalConfig.url) {
      const absoluteUrl = this.getAbsoluteUrl(finalConfig.url);
      this.meta.updateTag({ property: 'og:url', content: absoluteUrl });
    }

    // Update type
    if (finalConfig.type) {
      this.meta.updateTag({ property: 'og:type', content: finalConfig.type });
    }

    // Update author
    if (finalConfig.author) {
      this.meta.updateTag({ name: 'author', content: finalConfig.author });
      this.meta.updateTag({ property: 'article:author', content: finalConfig.author });
    }

    // Update published time
    if (finalConfig.publishedTime) {
      this.meta.updateTag({ property: 'article:published_time', content: finalConfig.publishedTime });
    }

    // Update modified time
    if (finalConfig.modifiedTime) {
      this.meta.updateTag({ property: 'article:modified_time', content: finalConfig.modifiedTime });
    }

    // Update Twitter card type
    if (finalConfig.twitterCard) {
      this.meta.updateTag({ name: 'twitter:card', content: finalConfig.twitterCard });
    }

    // Update audio (for episodes)
    if (finalConfig.audio) {
      const audioUrl = this.getAbsoluteUrl(finalConfig.audio);
      this.meta.updateTag({ property: 'og:audio', content: audioUrl });
      this.meta.updateTag({ property: 'og:audio:secure_url', content: audioUrl });
      if (finalConfig.audioType) {
        this.meta.updateTag({ property: 'og:audio:type', content: finalConfig.audioType });
      }
    }

    // Always set site name
    this.meta.updateTag({ property: 'og:site_name', content: 'Capital Copilot' });
  }

  private getAbsoluteUrl(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://capitalcopilot.com';
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }
}
