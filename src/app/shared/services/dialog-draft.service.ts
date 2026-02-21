// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';

/**
 * Storage keys for each dialog type
 */
const STORAGE_KEYS = {
  podcast: 'cc_draft_podcast',
  pulse: 'cc_draft_pulse',
  recording: 'cc_draft_recording',
} as const;

type DialogType = keyof typeof STORAGE_KEYS;

/**
 * Service to persist dialog form drafts to localStorage.
 * Drafts survive page navigation and browser refresh.
 * Clear drafts after successful submission.
 */
@Injectable({
  providedIn: 'root',
})
export class DialogDraftService {
  /**
   * Save a draft to localStorage
   */
  saveDraft<T extends object>(dialogType: DialogType, data: T): void {
    try {
      const json = JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(STORAGE_KEYS[dialogType], json);
    } catch {
      // localStorage may be full or unavailable - fail silently
    }
  }

  /**
   * Load a draft from localStorage
   */
  loadDraft<T extends object>(dialogType: DialogType): T | null {
    try {
      const json = localStorage.getItem(STORAGE_KEYS[dialogType]);
      if (!json) return null;

      const parsed = JSON.parse(json);
      return parsed.data as T;
    } catch {
      return null;
    }
  }

  /**
   * Clear a draft (call after successful submission)
   */
  clearDraft(dialogType: DialogType): void {
    try {
      localStorage.removeItem(STORAGE_KEYS[dialogType]);
    } catch {
      // Fail silently
    }
  }

  /**
   * Check if a draft exists
   */
  hasDraft(dialogType: DialogType): boolean {
    return localStorage.getItem(STORAGE_KEYS[dialogType]) !== null;
  }
}
