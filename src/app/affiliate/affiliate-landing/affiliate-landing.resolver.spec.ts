// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot, convertToParamMap } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AppConfigService } from '../../core/app-config.service';
import { SeoService } from '../../seo.service';
import { AffiliateLanding, AffiliateService } from '../affiliate.service';
import { affiliateLandingResolver } from './affiliate-landing.resolver';

function makeLanding(over: Partial<AffiliateLanding> = {}): AffiliateLanding {
  return {
    affiliateUsername: 'nik',
    brandImageUrl: null,
    customMessage: null,
    ...over,
  } as AffiliateLanding;
}

describe('affiliateLandingResolver', () => {
  let getAffiliateLanding: jasmine.Spy;
  let updateTags: jasmine.Spy;

  beforeEach(() => {
    getAffiliateLanding = jasmine.createSpy('getAffiliateLanding');
    updateTags = jasmine.createSpy('updateTags');
    TestBed.configureTestingModule({
      providers: [
        { provide: AffiliateService, useValue: { getAffiliateLanding } },
        { provide: SeoService, useValue: { updateTags } },
        { provide: AppConfigService, useValue: { config: { SITE_URL: 'https://site.test' } } },
      ],
    });
  });

  function resolve(code: string | null): Observable<AffiliateLanding | null> {
    const route = { paramMap: convertToParamMap(code ? { code } : {}) } as ActivatedRouteSnapshot;
    return TestBed.runInInjectionContext(() =>
      affiliateLandingResolver(route, {} as RouterStateSnapshot),
    ) as Observable<AffiliateLanding | null>;
  }

  it('resolves null without a code and skips the API', (done) => {
    resolve(null).subscribe((result) => {
      expect(result).toBeNull();
      expect(getAffiliateLanding).not.toHaveBeenCalled();
      done();
    });
  });

  it('sets default SEO tags from the affiliate username', (done) => {
    getAffiliateLanding.and.returnValue(of(makeLanding()));
    resolve('CODE1').subscribe((result) => {
      expect(result?.affiliateUsername).toBe('nik');
      expect(updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: "Join nik's Network | Capital Copilot",
          url: 'https://site.test/a/CODE1',
          image: undefined,
        }),
      );
      done();
    });
  });

  it('prefers the custom message and brand image when present', (done) => {
    getAffiliateLanding.and.returnValue(
      of(makeLanding({ customMessage: 'Welcome aboard!', brandImageUrl: 'https://cdn.test/b.png' })),
    );
    resolve('CODE2').subscribe(() => {
      expect(updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: 'Welcome aboard!',
          image: 'https://cdn.test/b.png',
        }),
      );
      done();
    });
  });

  it('skips SEO tags when the API returns null', (done) => {
    getAffiliateLanding.and.returnValue(of(null));
    resolve('CODE3').subscribe((result) => {
      expect(result).toBeNull();
      expect(updateTags).not.toHaveBeenCalled();
      done();
    });
  });

  it('resolves null when the API errors', (done) => {
    getAffiliateLanding.and.returnValue(throwError(() => new Error('bad code')));
    resolve('CODE4').subscribe((result) => {
      expect(result).toBeNull();
      expect(updateTags).not.toHaveBeenCalled();
      done();
    });
  });
});
