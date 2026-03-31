// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

export interface ShareConfig {
  url: string;
  title: string;
  description?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  /**
   * Generate a slug from a title
   */
  generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .trim();
  }

  /**
   * Build relative route for podcast (for routerLink)
   * Format: /podcasts/slug-uuid (UUID at end for friendlier URLs)
   */
  buildPodcastRoute(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `/podcasts/${slug}-${id}`;
  }

  /**
   * Build relative route for episode (for routerLink)
   * Format: /episodes/slug-uuid (UUID at end for friendlier URLs)
   */
  buildEpisodeRoute(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `/episodes/${slug}-${id}`;
  }

  /**
   * Build relative route for blog (for routerLink)
   * Format: /blogs/slug-uuid (UUID at end for friendlier URLs)
   */
  buildBlogRoute(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `/blogs/${slug}-${id}`;
  }

  /**
   * Build relative route for article (for routerLink)
   * Format: /articles/slug-uuid (UUID at end for friendlier URLs)
   */
  buildArticleRoute(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `/articles/${slug}-${id}`;
  }

  /**
   * Build SEO-friendly URL for podcast (full URL with domain)
   * Format: /podcasts/slug-uuid (UUID at end for friendlier URLs)
   */
  buildPodcastUrl(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `${environment.SITE_URL}/podcasts/${slug}-${id}`;
  }

  /**
   * Build SEO-friendly URL for episode (full URL with domain)
   * Format: /episodes/slug-uuid (UUID at end for friendlier URLs)
   */
  buildEpisodeUrl(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `${environment.SITE_URL}/episodes/${slug}-${id}`;
  }

  /**
   * Build SEO-friendly URL for blog (full URL with domain)
   * Format: /blogs/slug-uuid (UUID at end for friendlier URLs)
   */
  buildBlogUrl(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `${environment.SITE_URL}/blogs/${slug}-${id}`;
  }

  /**
   * Build SEO-friendly URL for article (full URL with domain)
   * Format: /articles/slug-uuid (UUID at end for friendlier URLs)
   */
  buildArticleUrl(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `${environment.SITE_URL}/articles/${slug}-${id}`;
  }

  /**
   * Extract ID from URL parameter (handles "id-slug", "slug-id", or "slug-id-slug" formats)
   * Supports both numeric IDs and UUIDs anywhere in the parameter
   */
  extractIdFromSlugParam(param: string): string {
    // Try to find a UUID anywhere in the string
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const uuidMatch = param.match(uuidPattern);
    if (uuidMatch) {
      return uuidMatch[0];
    }

    // Not a UUID, extract numeric ID (first part before hyphen)
    return param.split('-')[0];
  }

  /**
   * Share to Twitter/X
   */
  shareToTwitter(config: ShareConfig): void {
    const text = config.description ? `${config.title}\n\n${config.description}` : config.title;
    const url =
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}` + `&url=${encodeURIComponent(config.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  /**
   * Share to Facebook
   */
  shareToFacebook(config: ShareConfig): void {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(config.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  /**
   * Share to LinkedIn
   */
  shareToLinkedIn(config: ShareConfig): void {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(config.url)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  /**
   * Share to Reddit
   */
  shareToReddit(config: ShareConfig): void {
    const url =
      `https://reddit.com/submit?url=${encodeURIComponent(config.url)}` + `&title=${encodeURIComponent(config.title)}`;
    window.open(url, '_blank', 'width=550,height=420');
  }

  /**
   * Share to WhatsApp
   */
  shareToWhatsApp(config: ShareConfig): void {
    const text = config.description
      ? `${config.title}\n\n${config.description}\n\n${config.url}`
      : `${config.title}\n\n${config.url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  /**
   * Share to Telegram
   */
  shareToTelegram(config: ShareConfig): void {
    const text = config.description ? `${config.title}\n\n${config.description}` : config.title;
    const url = `https://t.me/share/url?url=${encodeURIComponent(config.url)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  /**
   * Share to Signal (opens signal:// URL)
   */
  shareToSignal(config: ShareConfig): void {
    const text = config.description
      ? `${config.title}\n\n${config.description}\n\n${config.url}`
      : `${config.title}\n\n${config.url}`;
    // Signal doesn't have a web share API, so we copy to clipboard and notify user
    this.copyToClipboard(text);
    alert('Link copied to clipboard! Open Signal to share.');
  }

  /**
   * Share via Email
   */
  shareToEmail(config: ShareConfig): void {
    const subject = encodeURIComponent(config.title);
    const body = config.description
      ? encodeURIComponent(`${config.description}\n\n${config.url}`)
      : encodeURIComponent(config.url);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }
  /**
   * Copy URL to clipboard
   */
  copyToClipboard(text: string): void {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        this.fallbackCopyToClipboard(text);
      });
    } else {
      this.fallbackCopyToClipboard(text);
    }
  }

  /**
   * Fallback copy method for older browsers
   */
  private fallbackCopyToClipboard(text: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy failed:', err);
    }
    document.body.removeChild(textArea);
  }

  /**
   * Use native Web Share API if available
   */
  async nativeShare(config: ShareConfig): Promise<boolean> {
    if (navigator.share) {
      try {
        await navigator.share({
          title: config.title,
          text: config.description,
          url: config.url,
        });
        return true;
      } catch {
        // User cancelled or error occurred
        return false;
      }
    }
    return false;
  }

  /**
   * Check if native sharing is available
   */
  canNativeShare(): boolean {
    return !!navigator.share;
  }
}
