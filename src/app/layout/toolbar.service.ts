// Copyright (c) 2025 Perpetuator LLC
import { Injectable, TemplateRef } from '@angular/core';

/**
 * @deprecated Use PageTitleService instead. This service is kept for backward compatibility
 * but does nothing. The TitleStrategy now automatically handles page titles from route definitions.
 *
 * To update a component:
 * 1. Remove @ViewChild('toolbarTemplate') and the ng-template from HTML
 * 2. Remove ToolbarService injection and setToolbarTemplate() call
 * 3. Ensure the route has a `title` property in app.routes.ts
 * 4. For dynamic titles, inject PageTitleService and call setTitle()
 */
@Injectable({
  providedIn: 'root',
})
export class ToolbarService {
  /**
   * @deprecated No longer needed - TitleStrategy handles this automatically
   */
  setRootViewContainerRef(): void {
    // No-op - kept for backward compatibility
  }

  /**
   * @deprecated Use route title or PageTitleService.setTitle() instead
   */
  getViewContainerRef(): null {
    console.warn(
      '[ToolbarService] Deprecated: Use PageTitleService instead. ' +
        'This method is a no-op and will be removed in a future version.',
    );
    return null;
  }

  /**
   * @deprecated Remove toolbar templates from components. The TitleStrategy
   * automatically reads titles from route definitions. For dynamic titles,
   * inject PageTitleService and call setTitle().
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setToolbarTemplate(_template: TemplateRef<unknown>): void {
    // No-op - kept for backward compatibility
    // Components can safely call this without breaking, but it does nothing
  }

  /**
   * @deprecated No longer needed
   */
  clearToolbarComponent(): void {
    // No-op - kept for backward compatibility
  }
}
