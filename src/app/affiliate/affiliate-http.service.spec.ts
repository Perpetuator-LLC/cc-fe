// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AffiliateHttpService, AffiliateLandingData } from './affiliate-http.service';
import { environment } from '../environments/environment';

describe('AffiliateHttpService', () => {
  let service: AffiliateHttpService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AffiliateHttpService],
    });
    service = TestBed.inject(AffiliateHttpService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAffiliateLanding - for NON-AUTHENTICATED users', () => {
    it('should fetch affiliate landing data using HTTP REST endpoint (no auth required)', () => {
      const mockCode = 'TEST123';
      const mockResponse: AffiliateLandingData = {
        affiliate_code: 'TEST123',
        affiliate_username: 'TestUser',
        brand_image_url: 'https://example.com/image.jpg',
      };

      service.getAffiliateLanding(mockCode).subscribe((data) => {
        expect(data).toEqual(mockResponse);
        expect(data.affiliate_code).toBe('TEST123');
        expect(data.affiliate_username).toBe('TestUser');
        expect(data.brand_image_url).toBe('https://example.com/image.jpg');
      });

      const req = httpMock.expectOne(`${environment.API_URL}/a/${mockCode}/`);
      expect(req.request.method).toBe('GET');
      expect(req.request.headers.has('Authorization')).toBe(false);

      req.flush(mockResponse);
    });

    it('should use snake_case properties matching backend REST API response format', () => {
      const mockCode = 'AFFILIATE123';
      const mockResponse = {
        affiliate_code: 'AFFILIATE123',
        affiliate_username: 'JohnDoe',
        brand_image_url: null,
      };

      service.getAffiliateLanding(mockCode).subscribe((data) => {
        expect('affiliate_code' in data).toBe(true);
        expect('affiliate_username' in data).toBe(true);
        expect('brand_image_url' in data).toBe(true);

        expect(data.affiliate_code).toBe('AFFILIATE123');
        expect(data.affiliate_username).toBe('JohnDoe');
        expect(data.brand_image_url).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.API_URL}/a/${mockCode}/`);
      req.flush(mockResponse);
    });

    it('should handle affiliate with no brand image (null)', () => {
      const mockCode = 'NOBRAND';
      const mockResponse: AffiliateLandingData = {
        affiliate_code: 'NOBRAND',
        affiliate_username: 'NoBrandUser',
        brand_image_url: null,
      };

      service.getAffiliateLanding(mockCode).subscribe((data) => {
        expect(data.brand_image_url).toBeNull();
      });

      const req = httpMock.expectOne(`${environment.API_URL}/a/${mockCode}/`);
      req.flush(mockResponse);
    });

    it('should handle error when affiliate code is invalid or inactive', () => {
      const mockCode = 'INVALID';
      const mockError = {
        exceptions: 'An error occurred (uncaught) No AffiliateProfile matches the given query.',
      };

      service.getAffiliateLanding(mockCode).subscribe({
        next: () => fail('should have failed with 500 error'),
        error: (error) => {
          expect(error.status).toBe(500);
        },
      });

      const req = httpMock.expectOne(`${environment.API_URL}/a/${mockCode}/`);
      req.flush(mockError, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should construct correct URL for affiliate landing endpoint', () => {
      const mockCode = 'XYZ789';
      const expectedUrl = `${environment.API_URL}/a/${mockCode}/`;

      service.getAffiliateLanding(mockCode).subscribe();

      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.url).toBe(expectedUrl);
      req.flush({
        affiliate_code: mockCode,
        affiliate_username: 'TestUser',
        brand_image_url: null,
      });
    });
  });

  describe('Public REST endpoint rationale', () => {
    it('should NOT require authentication headers (for anonymous landing page visitors)', () => {
      const mockCode = 'PUBLIC123';

      service.getAffiliateLanding(mockCode).subscribe();

      const req = httpMock.expectOne(`${environment.API_URL}/a/${mockCode}/`);

      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(req.request.headers.has('X-CSRFToken')).toBe(false);

      req.flush({
        affiliate_code: mockCode,
        affiliate_username: 'PublicUser',
        brand_image_url: null,
      });
    });
  });

  describe('Integration with affiliate landing flow', () => {
    it('should provide data for anonymous users to see affiliate name and brand before signup', () => {
      const mockCode = 'REFERRAL456';
      const mockResponse: AffiliateLandingData = {
        affiliate_code: 'REFERRAL456',
        affiliate_username: 'InfluencerName',
        brand_image_url: 'https://cdn.example.com/brand.png',
      };

      service.getAffiliateLanding(mockCode).subscribe((data) => {
        expect(data.affiliate_username).toBe('InfluencerName');
        expect(data.brand_image_url).toBeTruthy();
      });

      const req = httpMock.expectOne(`${environment.API_URL}/a/${mockCode}/`);
      req.flush(mockResponse);
    });
  });
});
