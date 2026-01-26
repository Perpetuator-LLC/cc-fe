// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';

export type MediaTab = 'pulses' | 'podcasts' | 'episodes' | 'news' | 'topics';

/**
 * Service to track user's last used media tab.
 * Stores preference in localStorage and provides default tab selection.
 */
@Injectable({
  providedIn: 'root',
})
export class MediaTabPreferenceService {
  private readonly STORAGE_KEY = 'media-tab-preference';
  private readonly DEFAULT_TAB: MediaTab = 'pulses';

  /**
   * Get the user's preferred media tab, defaulting to 'pulses' if not set
   */
  getPreferredTab(): MediaTab {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored && this.isValidTab(stored)) {
        return stored as MediaTab;
      }
    } catch {
      // localStorage not available
    }
    return this.DEFAULT_TAB;
  }

  /**
   * Save the user's preferred media tab
   */
  setPreferredTab(tab: MediaTab): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, tab);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Record a tab visit - call this when user navigates to a media tab
   */
  recordTabVisit(path: string): void {
    const tab = this.extractTabFromPath(path);
    if (tab) {
      this.setPreferredTab(tab);
    }
  }

  /**
   * Extract the media tab from a route path
   */
  private extractTabFromPath(path: string): MediaTab | null {
    if (path.includes('/media/pulses')) return 'pulses';
    if (path.includes('/media/podcasts')) return 'podcasts';
    if (path.includes('/media/episodes')) return 'episodes';
    if (path.includes('/media/news')) return 'news';
    if (path.includes('/media/topics')) return 'topics';
    return null;
  }

  private isValidTab(value: string): value is MediaTab {
    return ['pulses', 'podcasts', 'episodes', 'news', 'topics'].includes(value);
  }
}
