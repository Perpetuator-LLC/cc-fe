// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, signal } from '@angular/core';

export interface CreatePodcastFormData {
  description: string;
  teamSelection: string;
  newTeamName: string;
  title: string;
}

/**
 * Service to persist create podcast dialog form data across dialog open/close cycles.
 * Data is cleared after successful podcast creation.
 */
@Injectable({
  providedIn: 'root',
})
export class CreatePodcastDialogStateService {
  private formData = signal<CreatePodcastFormData | null>(null);

  /**
   * Save current form state
   */
  saveFormData(data: CreatePodcastFormData): void {
    this.formData.set(data);
  }

  /**
   * Get saved form data
   */
  getFormData(): CreatePodcastFormData | null {
    return this.formData();
  }

  /**
   * Clear saved form data (call after successful creation)
   */
  clearFormData(): void {
    this.formData.set(null);
  }

  /**
   * Check if there's saved data
   */
  hasSavedData(): boolean {
    return this.formData() !== null;
  }
}
