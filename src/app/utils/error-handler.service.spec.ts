// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ErrorHandlerService } from './error-handler.service';
import { getCommonTestProviders } from '../testing/test-helpers';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [...getCommonTestProviders(), provideRouter([])],
    });
    service = TestBed.inject(ErrorHandlerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
