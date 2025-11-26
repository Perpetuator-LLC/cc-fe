// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { PodcastsService } from './podcasts.service';
import { ErrorHandlerService } from './error-handler.service';

describe('PodcastsService', () => {
  let service: PodcastsService;
  let mockApollo: jasmine.SpyObj<Apollo>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    mockApollo.query.and.returnValue(of({ data: {} }));
    mockApollo.mutate.and.returnValue(of({ data: {} }));

    TestBed.configureTestingModule({
      providers: [
        PodcastsService,
        { provide: Apollo, useValue: mockApollo },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });
    service = TestBed.inject(PodcastsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
