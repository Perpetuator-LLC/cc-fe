// Copyright (c) 2025 Perpetuator LLC
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
      .trim();
  }

  /**
   * Build relative route for podcast (for routerLink)
   */
  buildPodcastRoute(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `/podcasts/${id}-${slug}`;
  }

  /**
   * Build relative route for episode (for routerLink)
   */
  buildEpisodeRoute(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `/episodes/${id}-${slug}`;
  }

  /**
   * Build SEO-friendly URL for podcast (full URL with domain)
   */
  buildPodcastUrl(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `${environment.SITE_URL}/podcasts/${id}-${slug}`;
  }

  /**
   * Build SEO-friendly URL for episode (full URL with domain)
   */
  buildEpisodeUrl(id: string, title: string): string {
    const slug = this.generateSlug(title);
    return `${environment.SITE_URL}/episodes/${id}-${slug}`;
  }

  /**
   * Extract ID from URL parameter (handles "id-slug" or "uuid-slug" format)
   * Supports both numeric IDs and UUIDs
   */
  extractIdFromSlugParam(param: string): string {
    // Check if this looks like a UUID (36 characters with hyphens in the right places)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    if (param.length >= 36) {
      const possibleUuid = param.substring(0, 36);
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(possibleUuid)) {
        return possibleUuid;
      }
    }

    // Fallback: try regex approach for UUID
    const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const uuidMatch = param.match(uuidPattern);
    if (uuidMatch) {
      return uuidMatch[1];
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
