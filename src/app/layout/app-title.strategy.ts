// Copyright (c) 2025 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { PageTitleService } from './page-title.service';

/**
 * Custom TitleStrategy that sets both the browser title and the page title service.
 * This enables automatic page title updates based on route data.
 *
 * Routes can define titles in their data:
 * ```typescript
 * {
 *   path: 'podcasts',
 *   component: PodcastsListComponent,
 *   title: 'Podcasts',
 *   data: { icon: 'podcasts' }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly pageTitleService = inject(PageTitleService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot);
    const routeData = this.getDeepestRouteData(snapshot);

    if (title) {
      // Set browser title with app name suffix
      this.title.setTitle(`${title} | Capital Copilot`);

      // Set page title service for toolbar display
      this.pageTitleService.setTitle({
        title,
        icon: routeData?.['icon'] as string | undefined,
        breadcrumb: routeData?.['breadcrumb'] as string | undefined,
      });
    } else {
      this.title.setTitle('Capital Copilot');
      this.pageTitleService.clearTitle();
    }
  }

  /**
   * Gets the data from the deepest activated route
   */
  private getDeepestRouteData(snapshot: RouterStateSnapshot): Record<string, unknown> | null {
    let route = snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route.data as Record<string, unknown>;
  }
}
