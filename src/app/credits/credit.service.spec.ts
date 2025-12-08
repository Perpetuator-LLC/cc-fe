// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CreditService } from './credit.service';
import { ErrorHandlerService } from '../utils/error-handler.service';
import { getCommonTestProviders } from '../testing/test-helpers';
import { provideMockApollo } from '../testing/test-providers';

describe('CreditService', () => {
  let service: CreditService;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        CreditService,
        ...getCommonTestProviders(),
        provideMockApollo(),
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });
    service = TestBed.inject(CreditService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
