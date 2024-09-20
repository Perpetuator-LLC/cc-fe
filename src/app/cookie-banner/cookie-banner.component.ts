import { Component, computed } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCardFooter } from '@angular/material/card';
import { MatTabLink } from '@angular/material/tabs';
import { CookieConsentService } from '../cookie-consent.service';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [MatButton, MatCardFooter, MatTabLink],
  templateUrl: './cookie-banner.component.html',
  styleUrls: ['./cookie-banner.component.scss'],
})
export class CookieBannerComponent {
  showBanner = computed(() => {
    const consent = this.cookieConsentService.cookieConsent();
    return !consent || consent.version !== this.cookieConsentService.COOKIE_CONSENT_VERSION;
  });

  constructor(private cookieConsentService: CookieConsentService) {}

  acceptCookies(): void {
    this.cookieConsentService.setCookieConsent(true);
  }

  declineCookies(): void {
    this.cookieConsentService.setCookieConsent(false);
  }
}
