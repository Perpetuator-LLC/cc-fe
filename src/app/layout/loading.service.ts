// Copyright (c) 2025 Perpetuator LLC
import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingState = signal(false);

  // Expose as readonly signal
  readonly loading = this.loadingState.asReadonly();

  setLoading(loading: boolean): void {
    this.loadingState.set(loading);
  }

  show(): void {
    this.setLoading(true);
  }

  hide(): void {
    this.setLoading(false);
  }
}
