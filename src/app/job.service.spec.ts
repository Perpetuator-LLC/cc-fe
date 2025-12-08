// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { JobService } from './jobs/job.service';
import { ErrorHandlerService } from './error-handler.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { getCommonTestProviders } from './testing/test-helpers';
import { provideMockApollo } from './testing/test-providers';

describe('JobService', () => {
  let service: JobService;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        JobService,
        ...getCommonTestProviders(),
        provideMockApollo(),
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });
    service = TestBed.inject(JobService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
