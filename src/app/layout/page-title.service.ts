// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal, computed } from '@angular/core';

export interface PageTitleConfig {
  /** The page title to display */
  title: string;
  /** Optional icon to show before the title */
  icon?: string;
  /** Optional breadcrumb prefix (e.g., "Podcasts" > "My Podcast") */
  breadcrumb?: string;
}

/**
 * Modern page title service using Angular signals.
 * Replaces the complex ViewContainerRef/ng-template toolbar injection pattern.
 *
 * Usage in components:
 * ```typescript
 * constructor(private pageTitleService: PageTitleService) {}
 *
 * ngOnInit() {
 *   this.pageTitleService.setTitle('My Page');
 *   // or with icon:
 *   this.pageTitleService.setTitle({ title: 'My Page', icon: 'home' });
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class PageTitleService {
  private readonly _config = signal<PageTitleConfig>({ title: '' });

  /** The current page title configuration */
  readonly config = this._config.asReadonly();

  /** Just the title string for simple use cases */
  readonly title = computed(() => this._config().title);

  /** The icon if set */
  readonly icon = computed(() => this._config().icon);

  /** The breadcrumb if set */
  readonly breadcrumb = computed(() => this._config().breadcrumb);

  /**
   * Set the page title. Can be a simple string or a full config object.
   */
  setTitle(titleOrConfig: string | PageTitleConfig): void {
    if (typeof titleOrConfig === 'string') {
      this._config.set({ title: titleOrConfig });
    } else {
      this._config.set(titleOrConfig);
    }
  }

  /**
   * Clear the page title
   */
  clearTitle(): void {
    this._config.set({ title: '' });
  }
}
