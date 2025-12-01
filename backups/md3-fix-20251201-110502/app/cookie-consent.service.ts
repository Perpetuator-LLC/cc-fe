// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
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

  get cookieConsent(): WritableSignal<CookieConsent | null> {
    return this.cookieConsentSignal;
  }

  constructor() {
    // Load consent from localStorage without version validation
    // Version validation happens in the cookie banner component
    const localConsent = this.loadConsentFromLocalStorage();
    if (localConsent) {
      this.cookieConsentSignal.set(localConsent);
    }
  }

  private loadConsentFromLocalStorage(): CookieConsent | null {
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

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
