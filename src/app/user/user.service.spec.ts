// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { UserService } from './user.service';
import { ErrorHandlerService } from '../error-handler.service';

describe('UserPreferenceService', () => {
  let service: UserService;
  let mockApollo: jasmine.SpyObj<Apollo>;
  let mockErrorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockErrorHandler = jasmine.createSpyObj('ErrorHandlerService', ['handleError']);

    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
    mockApollo.mutate.and.returnValue(of({ data: {} }));

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: Apollo, useValue: mockApollo },
        { provide: ErrorHandlerService, useValue: mockErrorHandler },
      ],
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
