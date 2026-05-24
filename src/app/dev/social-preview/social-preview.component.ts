// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppConfigService } from '../../core/app-config.service';

interface SocialMetaTags {
  title: string | null;
  description: string | null;
  og: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    site_name?: string;
  };
  twitter: {
    card?: string;
    title?: string;
    description?: string;
    image?: string;
    site?: string;
  };
}

interface PreviewResult {
  url: string;
  tags: SocialMetaTags;
  warnings: string[];
  fetchedAt: Date;
}

@Component({
  selector: 'app-social-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './social-preview.component.html',
  styleUrl: './social-preview.component.scss',
})
export class SocialPreviewComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly appConfig = inject(AppConfigService);

  urlInput = '';
  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<PreviewResult | null>(null);

  // Computed values for template to avoid calling signals in loops
  isLoading = computed(() => this.loading());
  errorMessage = computed(() => this.error());
  previewResult = computed(() => this.result());

  /**
   * Pre-computed display strings for the preview cards so the template
   * reads property access instead of calling getImageUrl/truncateText
   * for every section on every change-detection tick.
   */
  previewDisplay = computed(() => {
    const res = this.result();
    if (!res) return null;
    const ogDescOrTagsDesc = res.tags.og.description || res.tags.description;
    const twDescOrFallback = res.tags.twitter.description || res.tags.og.description || res.tags.description;
    return {
      ogImageUrl: this.getImageUrl(res.tags.og.image, res.url),
      twitterImageUrl: this.getImageUrl(res.tags.twitter.image, res.url),
      ogDescriptionShort: this.truncateText(ogDescOrTagsDesc, 100),
      ogDescriptionMedium: this.truncateText(ogDescOrTagsDesc, 150),
      twitterDescriptionShort: this.truncateText(twDescOrFallback, 100),
    };
  });

  // Preset URLs for quick testing (uses runtime SITE_URL)
  readonly siteUrl = this.appConfig.config.SITE_URL;
  readonly presetUrls = [
    { label: 'Home', url: `${this.siteUrl}/` },
    { label: 'Affiliate (HUMN)', url: `${this.siteUrl}/a/HUMN` },
    { label: 'Login', url: `${this.siteUrl}/login` },
    { label: 'Register', url: `${this.siteUrl}/register` },
  ];

  ngOnInit(): void {
    // Check for URL in query params on load
    const urlParam = this.route.snapshot.queryParamMap.get('url');
    if (urlParam) {
      this.urlInput = urlParam;
      this.fetchPreview();
    }
  }

  async fetchPreview(): Promise<void> {
    if (!this.urlInput.trim()) {
      this.error.set('Please enter a URL');
      return;
    }

    let url = this.urlInput.trim();

    // Handle relative URLs
    if (url.startsWith('/')) {
      url = window.location.origin + url;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      this.error.set('Invalid URL format');
      return;
    }

    // Update query param for browser history
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { url: this.urlInput.trim() },
      queryParamsHandling: 'merge',
    });

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      // We need to fetch the HTML through our own server or use a CORS proxy
      // For now, we'll try to fetch directly (works for same-origin) or use a proxy
      const html = await this.fetchHtml(url);
      const tags = this.extractMetaTags(html);
      const warnings = this.validateTags(tags);

      this.result.set({
        url,
        tags,
        warnings,
        fetchedAt: new Date(),
      });
    } catch (err) {
      this.error.set(`Failed to fetch URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchHtml(url: string): Promise<string> {
    // Try direct fetch first (works for same-origin or CORS-enabled)
    const directResponse = await fetch(url, {
      headers: {
        Accept: 'text/html',
      },
    }).catch(() => null);

    if (directResponse?.ok) {
      return await directResponse.text();
    }

    // If direct fetch fails due to CORS, try using a public CORS proxy
    // Note: For production, you might want to set up your own proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    return await response.text();
  }

  private extractMetaTags(html: string): SocialMetaTags {
    const tags: SocialMetaTags = {
      title: null,
      description: null,
      og: {},
      twitter: {},
    };

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      tags.title = titleMatch[1].trim();
    }

    // Extract meta tags
    const metaRegex = /<meta\s+([^>]+)>/gi;
    let match;

    while ((match = metaRegex.exec(html)) !== null) {
      const attrs = match[1];

      // Parse attributes - handle both single and double quotes
      const nameMatch = attrs.match(/name="([^"]+)"|name='([^']+)'/i);
      const propertyMatch = attrs.match(/property="([^"]+)"|property='([^']+)'/i);
      const contentMatch = attrs.match(/content="([^"]+)"|content='([^']+)'/i);

      const name = nameMatch?.[1] || nameMatch?.[2] || propertyMatch?.[1] || propertyMatch?.[2];
      const content = contentMatch?.[1] || contentMatch?.[2];

      if (!name || !content) continue;

      if (name.startsWith('og:')) {
        const key = name.replace('og:', '');
        (tags.og as Record<string, string>)[key] = content;
      } else if (name.startsWith('twitter:')) {
        const key = name.replace('twitter:', '');
        (tags.twitter as Record<string, string>)[key] = content;
      } else if (name === 'description') {
        tags.description = content;
      }
    }

    return tags;
  }

  private validateTags(tags: SocialMetaTags): string[] {
    const warnings: string[] = [];

    if (!tags.og.title) warnings.push('Missing og:title');
    if (!tags.og.description) warnings.push('Missing og:description');
    if (!tags.og.image) warnings.push('Missing og:image');
    if (!tags.twitter.title) warnings.push('Missing twitter:title');
    if (!tags.twitter.description) warnings.push('Missing twitter:description');
    if (!tags.twitter.image) warnings.push('Missing twitter:image');

    if (tags.og.title && tags.og.title.length > 60) {
      warnings.push(`og:title too long (${tags.og.title.length} chars, recommend < 60)`);
    }
    if (tags.og.description && tags.og.description.length > 200) {
      warnings.push(`og:description too long (${tags.og.description.length} chars, recommend < 200)`);
    }

    return warnings;
  }

  selectPreset(url: string): void {
    this.urlInput = url;
    this.fetchPreview();
  }

  getImageUrl(imageUrl: string | undefined, baseUrl: string): string {
    if (!imageUrl) return '';

    // If it's already an absolute URL, return as-is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // If it's a relative URL, resolve it against the base URL
    try {
      return new URL(imageUrl, baseUrl).href;
    } catch {
      return imageUrl;
    }
  }

  truncateText(text: string | null | undefined, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
