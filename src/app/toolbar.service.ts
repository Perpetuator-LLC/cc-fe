// Copyright (c) 2025 Perpetuator LLC
import { Injectable, ViewContainerRef, TemplateRef } from '@angular/core';
import { BehaviorSubject, filter, take } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ToolbarService {
  private viewContainerRef$ = new BehaviorSubject<ViewContainerRef | null>(null);

  setRootViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef$.next(viewContainerRef);
  }

  getViewContainerRef(): ViewContainerRef {
    const vcr = this.viewContainerRef$.getValue();
    if (!vcr) {
      console.warn('[ToolbarService] ViewContainerRef not yet available');
    }
    return vcr!;
  }

  /**
   * Sets the toolbar content from a template.
   * Waits for the ViewContainerRef to be available if it's not ready yet.
   */
  setToolbarTemplate(template: TemplateRef<unknown>): void {
    // If VCR is already available, set immediately
    const vcr = this.viewContainerRef$.getValue();
    if (vcr) {
      vcr.clear();
      vcr.createEmbeddedView(template);
      return;
    }

    // Otherwise wait for it to become available
    this.viewContainerRef$
      .pipe(
        filter((v): v is ViewContainerRef => v !== null),
        take(1),
      )
      .subscribe((vcr) => {
        vcr.clear();
        vcr.createEmbeddedView(template);
      });
  }

  clearToolbarComponent() {
    const vcr = this.viewContainerRef$.getValue();
    if (vcr) {
      vcr.clear();
    }
  }
}
