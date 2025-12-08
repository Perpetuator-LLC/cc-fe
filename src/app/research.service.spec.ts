// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ResearchService } from './topics/research.service';
import { Apollo } from 'apollo-angular';
import { ErrorHandlerService } from './utils/error-handler.service';

describe('ResearchService', () => {
  let service: ResearchService;
  let apolloMock: jasmine.SpyObj<Apollo>;
  let errorHandlerMock: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    apolloMock = jasmine.createSpyObj('Apollo', ['mutate']);
    errorHandlerMock = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    TestBed.configureTestingModule({
      providers: [
        ResearchService,
        { provide: Apollo, useValue: apolloMock },
        { provide: ErrorHandlerService, useValue: errorHandlerMock },
      ],
    });
    service = TestBed.inject(ResearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
