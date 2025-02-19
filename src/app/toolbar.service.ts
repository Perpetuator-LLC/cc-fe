// Copyright (c) 2025 Perpetuator LLC
import { Injectable, ViewContainerRef } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ToolbarService {
  private viewContainerRef!: ViewContainerRef;

  setRootViewContainerRef(viewContainerRef: ViewContainerRef) {
    this.viewContainerRef = viewContainerRef;
  }

  getViewContainerRef(): ViewContainerRef {
    return this.viewContainerRef;
  }

  clearToolbarComponent() {
    if (this.viewContainerRef) {
      this.viewContainerRef.clear();
    }
  }
}
