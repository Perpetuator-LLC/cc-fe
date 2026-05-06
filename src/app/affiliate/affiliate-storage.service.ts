// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AffiliateStorageService {
  private readonly AFFILIATE_CODE_KEY = 'pending_affiliate_code';
  private readonly RETURN_URL_KEY = 'pending_return_url';
  private isBrowser: boolean;

  constructor() {
    const platformId = inject(PLATFORM_ID);

    this.isBrowser = isPlatformBrowser(platformId);
  }

  setAffiliateCode(code: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.AFFILIATE_CODE_KEY, code);
  }

  getAffiliateCode(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.AFFILIATE_CODE_KEY);
  }

  clearAffiliateCode(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.AFFILIATE_CODE_KEY);
  }

  hasAffiliateCode(): boolean {
    return !!this.getAffiliateCode();
  }

  setReturnUrl(url: string): void {
    if (!this.isBrowser) return;
    localStorage.setItem(this.RETURN_URL_KEY, url);
  }

  getReturnUrl(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.RETURN_URL_KEY);
  }

  clearReturnUrl(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(this.RETURN_URL_KEY);
  }

  hasReturnUrl(): boolean {
    return !!this.getReturnUrl();
  }
}
