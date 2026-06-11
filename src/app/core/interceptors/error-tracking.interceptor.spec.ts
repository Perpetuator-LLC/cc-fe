// Copyright (c) 2026 Perpetuator LLC
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TraceService } from '../../traces/trace.service';
import { errorTrackingInterceptor } from './error-tracking.interceptor';

describe('errorTrackingInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let trackAPIError: jasmine.Spy;

  beforeEach(() => {
    trackAPIError = jasmine.createSpy('trackAPIError').and.returnValue(of(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorTrackingInterceptor])),
        provideHttpClientTesting(),
        { provide: TraceService, useValue: { trackAPIError } },
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('tracks failed REST requests and rethrows the error', (done) => {
    http.post('/api/things/', { name: 'x' }).subscribe({
      next: () => done.fail('expected an error'),
      error: (error) => {
        expect(error.status).toBe(500);
        expect(trackAPIError).toHaveBeenCalledWith('/api/things/', 'POST', jasmine.objectContaining({ status: 500 }), {
          name: 'x',
        });
        done();
      },
    });
    controller.expectOne('/api/things/').flush('boom', { status: 500, statusText: 'Server Error' });
  });

  it('does not track errors from GraphQL requests', (done) => {
    http.post('/graphql/', { query: '{ me }' }).subscribe({
      next: () => done.fail('expected an error'),
      error: () => {
        expect(trackAPIError).not.toHaveBeenCalled();
        done();
      },
    });
    controller.expectOne('/graphql/').flush('boom', { status: 500, statusText: 'Server Error' });
  });

  it('passes successful responses through untouched', (done) => {
    http.get('/api/ok/').subscribe((body) => {
      expect(body).toEqual({ fine: true });
      expect(trackAPIError).not.toHaveBeenCalled();
      done();
    });
    controller.expectOne('/api/ok/').flush({ fine: true });
  });
});
