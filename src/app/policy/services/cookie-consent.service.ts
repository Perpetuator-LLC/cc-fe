// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, PLATFORM_ID, signal, WritableSignal, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';

interface CookieConsent {
  version: string;
  accepted: boolean;
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class CookieConsentService implements OnDestroy {
  private subscriptions = new Subscription();
  private cookieConsentSignal: WritableSignal<CookieConsent | null> = signal(null);
  private readonly isBrowser: boolean;

  get cookieConsent(): WritableSignal<CookieConsent | null> {
    return this.cookieConsentSignal;
  }

  constructor() {
    const platformId = inject(PLATFORM_ID);
    this.isBrowser = isPlatformBrowser(platformId);

    // Load consent from localStorage without version validation
    // Version validation happens in the cookie banner component
    // Only load in browser (localStorage not available during SSR)
    if (this.isBrowser) {
      const localConsent = this.loadConsentFromLocalStorage();
      if (localConsent) {
        this.cookieConsentSignal.set(localConsent);
      }
    }
  }

  private loadConsentFromLocalStorage(): CookieConsent | null {
    if (!this.isBrowser) return null;

    const storedConsent = localStorage.getItem('cookie_consent');
    if (!storedConsent) {
      return null;
    }
    try {
      return JSON.parse(storedConsent);
    } catch (e) {
      console.error('[CookieConsent] Invalid JSON in localStorage:', e);
      localStorage.removeItem('cookie_consent');
      return null;
    }
  }

  /**
   * Reload consent from localStorage.
   * Call this after hydration if the signal wasn't properly initialized during SSR.
   */
  reloadFromLocalStorage(): void {
    if (!this.isBrowser) return;

    const localConsent = this.loadConsentFromLocalStorage();
    if (localConsent && !this.cookieConsentSignal()) {
      // Only set if not already set (to avoid overwriting a more recent value)
      this.cookieConsentSignal.set(localConsent);
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
