// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { CodeService } from './code.service';
import { ErrorHandlerService } from '../utils/error-handler.service';

describe('BonusService', () => {
  let service: CodeService;
  let mockApollo: jasmine.SpyObj<Apollo>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        CodeService,
        { provide: Apollo, useValue: mockApollo },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });
    service = TestBed.inject(CodeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
