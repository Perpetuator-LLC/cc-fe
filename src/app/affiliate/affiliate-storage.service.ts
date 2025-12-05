// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AffiliateStorageService {
  private readonly AFFILIATE_CODE_KEY = 'pending_affiliate_code';
  private readonly RETURN_URL_KEY = 'pending_return_url';

  setAffiliateCode(code: string): void {
    localStorage.setItem(this.AFFILIATE_CODE_KEY, code);
  }

  getAffiliateCode(): string | null {
    return localStorage.getItem(this.AFFILIATE_CODE_KEY);
  }

  clearAffiliateCode(): void {
    localStorage.removeItem(this.AFFILIATE_CODE_KEY);
  }

  hasAffiliateCode(): boolean {
    return !!this.getAffiliateCode();
  }

  setReturnUrl(url: string): void {
    localStorage.setItem(this.RETURN_URL_KEY, url);
  }

  getReturnUrl(): string | null {
    return localStorage.getItem(this.RETURN_URL_KEY);
  }

  clearReturnUrl(): void {
    localStorage.removeItem(this.RETURN_URL_KEY);
  }

  hasReturnUrl(): boolean {
    return !!this.getReturnUrl();
  }
}
