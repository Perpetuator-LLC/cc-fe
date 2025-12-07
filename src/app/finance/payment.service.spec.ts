// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { PaymentService } from './payment.service';
import { ErrorHandlerService } from '../error-handler.service';

describe('PaymentService', () => {
  let service: PaymentService;
  let mockApollo: jasmine.SpyObj<Apollo>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
    mockApollo.mutate.and.returnValue(of({ data: {} }));

    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        { provide: Apollo, useValue: mockApollo },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });
    service = TestBed.inject(PaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
