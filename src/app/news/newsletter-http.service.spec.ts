// Copyright (c) 2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { NewsletterHttpService } from './newsletter-http.service';
import { AppConfigService } from '../core/app-config.service';

const API_URL = 'https://api.test';

describe('NewsletterHttpService', () => {
  let service: NewsletterHttpService;
  let http: HttpTestingController;

  beforeEach(() => {
    const appConfig = { config: { API_URL } } as unknown as AppConfigService;
    TestBed.configureTestingModule({
      providers: [
        NewsletterHttpService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: appConfig },
      ],
    });
    service = TestBed.inject(NewsletterHttpService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('posts the email to subscribe', (done) => {
    service.subscribe('nik@example.com').subscribe((response) => {
      expect(response.success).toBeTrue();
      done();
    });
    const req = http.expectOne(`${API_URL}/newsletter/subscribe/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'nik@example.com' });
    req.flush({ success: true, message: 'subscribed' });
  });

  it('posts the email to unsubscribe', (done) => {
    service.unsubscribe('nik@example.com').subscribe((response) => {
      expect(response.success).toBeTrue();
      done();
    });
    const req = http.expectOne(`${API_URL}/newsletter/unsubscribe/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'nik@example.com' });
    req.flush({ success: true, message: 'unsubscribed' });
  });
});
