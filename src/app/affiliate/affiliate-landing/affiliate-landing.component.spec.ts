// Copyright (c) 2025-2026 Perpetuator LLC
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AffiliateLandingComponent } from './affiliate-landing.component';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AffiliateService, AffiliateLanding } from '../affiliate.service';
import { AffiliateStorageService } from '../affiliate-storage.service';
import { AuthService } from '../../auth/auth.service';
import { MessageService } from '../../message.service';
import { TraceService } from '../../traces/trace.service';
import { SeoService } from '../../seo.service';
import { of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AffiliateLandingComponent', () => {
  let component: AffiliateLandingComponent;
  let fixture: ComponentFixture<AffiliateLandingComponent>;
  let mockAffiliateService: jasmine.SpyObj<AffiliateService>;
  let mockSeoService: jasmine.SpyObj<SeoService>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockTraceService: jasmine.SpyObj<TraceService>;
  let mockAffiliateStorageService: jasmine.SpyObj<AffiliateStorageService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;

  const mockAffiliateLandingWithCustomMessage: AffiliateLanding = {
    affiliateCode: 'GOOSE',
    affiliateUsername: 'Goose',
    brandImageUrl: 'https://example.com/brand.jpg',
    customMessage: "Join Goose's Network!",
  };

  const mockAffiliateLandingWithoutCustomMessage: AffiliateLanding = {
    affiliateCode: 'TEST123',
    affiliateUsername: 'TestUser',
    brandImageUrl: 'https://example.com/image.jpg',
    customMessage: null,
  };

  beforeEach(async () => {
    mockAffiliateService = jasmine.createSpyObj('AffiliateService', [
      'getAffiliateLanding',
      'getMyAffiliateRelationship',
    ]);
    mockSeoService = jasmine.createSpyObj('SeoService', ['updateTags']);
    mockAuthService = jasmine.createSpyObj('AuthService', ['isLoggedIn']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockTraceService = jasmine.createSpyObj('TraceService', ['trackGraphQLError']);
    mockAffiliateStorageService = jasmine.createSpyObj('AffiliateStorageService', [
      'setAffiliateCode',
      'clearAffiliateCode',
    ]);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages']);

    // Default mock return values
    mockAuthService.isLoggedIn.and.returnValue(false);
    mockTraceService.trackGraphQLError.and.returnValue(of(true));

    await TestBed.configureTestingModule({
      imports: [AffiliateLandingComponent, NoopAnimationsModule],
      providers: [
        { provide: AffiliateService, useValue: mockAffiliateService },
        { provide: SeoService, useValue: mockSeoService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
        { provide: TraceService, useValue: mockTraceService },
        { provide: AffiliateStorageService, useValue: mockAffiliateStorageService },
        { provide: MessageService, useValue: mockMessageService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ code: 'GOOSE' }),
            },
          },
        },
      ],
    }).compileComponents();
  });

  describe('SEO Tags with customMessage', () => {
    beforeEach(() => {
      mockAffiliateService.getAffiliateLanding.and.returnValue(of(mockAffiliateLandingWithCustomMessage));
      fixture = TestBed.createComponent(AffiliateLandingComponent);
      component = fixture.componentInstance;
    });

    it('should use customMessage as the title when available', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: "Join Goose's Network!",
        }),
      );
    }));

    it('should set correct og:url with affiliate code', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          url: jasmine.stringMatching(/\/a\/GOOSE$/),
        }),
      );
    }));

    it('should set brand image for og:image', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          image: 'https://example.com/brand.jpg',
        }),
      );
    }));

    it('should set twitterCard to summary_large_image', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          twitterCard: 'summary_large_image',
        }),
      );
    }));

    it('should use generic description when customMessage is set', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          description: 'Start your journey with Capital Copilot through this affiliate invitation.',
        }),
      );
    }));
  });

  describe('SEO Tags without customMessage', () => {
    beforeEach(() => {
      mockAffiliateService.getAffiliateLanding.and.returnValue(of(mockAffiliateLandingWithoutCustomMessage));

      TestBed.overrideProvider(ActivatedRoute, {
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({ code: 'TEST123' }),
          },
        },
      });

      fixture = TestBed.createComponent(AffiliateLandingComponent);
      component = fixture.componentInstance;
    });

    it('should use default title format when customMessage is null', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: "Join TestUser's Network | Capital Copilot",
        }),
      );
    }));

    it('should include affiliate username in description when no customMessage', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          description: jasmine.stringMatching(/TestUser/),
        }),
      );
    }));

    it('should use default title format when customMessage is empty string', fakeAsync(() => {
      const affiliateWithEmptyMessage: AffiliateLanding = {
        ...mockAffiliateLandingWithoutCustomMessage,
        customMessage: '',
      };
      mockAffiliateService.getAffiliateLanding.and.returnValue(of(affiliateWithEmptyMessage));

      fixture = TestBed.createComponent(AffiliateLandingComponent);
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).toHaveBeenCalledWith(
        jasmine.objectContaining({
          title: "Join TestUser's Network | Capital Copilot",
        }),
      );
    }));
  });

  describe('Error handling', () => {
    it('should not call updateTags when affiliate data fetch fails', fakeAsync(() => {
      mockAffiliateService.getAffiliateLanding.and.returnValue(throwError(() => new Error('Not found')));

      fixture = TestBed.createComponent(AffiliateLandingComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      tick();

      expect(mockSeoService.updateTags).not.toHaveBeenCalled();
      expect(component.error).toBe('Invalid or inactive affiliate code');
    }));
  });
});
