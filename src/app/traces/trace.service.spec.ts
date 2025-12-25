// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { ApolloTestingModule, ApolloTestingController } from 'apollo-angular/testing';
import { TraceService } from './trace.service';

describe('TraceService', () => {
  let service: TraceService;
  let controller: ApolloTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApolloTestingModule],
      providers: [TraceService],
    });
    service = TestBed.inject(TraceService);
    controller = TestBed.inject(ApolloTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should record a basic trace', (done) => {
    service
      .recordTrace({
        kind: 'frontend_error',
        severity: 'ERROR',
        message: 'Test error',
      })
      .subscribe((success) => {
        expect(success).toBe(true);
        done();
      });

    const op = controller.expectOne('RecordTrace');
    expect(op.operation.variables['kind']).toBe('frontend_error');
    expect(op.operation.variables['severity']).toBe('ERROR');
    expect(op.operation.variables['message']).toBe('Test error');

    op.flush({
      data: {
        recordTrace: {
          success: true,
          message: null,
          traceId: 'test-trace-id',
        },
      },
    });
  });

  it('should track frontend errors', (done) => {
    const error = new Error('Test error');

    service.trackError(error).subscribe((success) => {
      expect(success).toBe(true);
      done();
    });

    const op = controller.expectOne('RecordTrace');
    expect(op.operation.variables['kind']).toBe('frontend_error');
    expect(op.operation.variables['exceptionType']).toBe('Error');

    op.flush({
      data: {
        recordTrace: {
          success: true,
          message: null,
          traceId: 'test-trace-id',
        },
      },
    });
  });

  it('should track auth failures', (done) => {
    service.trackAuthFailure('testuser', 'Invalid credentials').subscribe((success) => {
      expect(success).toBe(true);
      done();
    });

    const op = controller.expectOne('RecordTrace');
    expect(op.operation.variables['kind']).toBe('auth_failure');
    expect(op.operation.variables['severity']).toBe('WARNING');

    op.flush({
      data: {
        recordTrace: {
          success: true,
          message: null,
          traceId: 'test-trace-id',
        },
      },
    });
  });

  it('should handle trace recording failures gracefully', (done) => {
    service.trackError(new Error('Test')).subscribe((success) => {
      expect(success).toBe(false);
      done();
    });

    const op = controller.expectOne('RecordTrace');
    op.networkError(new Error('Network error'));
  });

  it('should sanitize sensitive variables', (done) => {
    service
      .trackGraphQLError('TestOperation', 'Error', {
        password: 'secret123',
        username: 'testuser',
        token: 'abc123',
      })
      .subscribe(() => {
        done();
      });

    const op = controller.expectOne('RecordTrace');
    const inputs = JSON.parse(op.operation.variables['inputs'] as string);
    expect(inputs.variables.password).toBe('[REDACTED]');
    expect(inputs.variables.token).toBe('[REDACTED]');
    // Username is allowed through for trace correlation/debugging (not hashed)
    expect(inputs.variables.username).toBe('testuser');

    op.flush({
      data: {
        recordTrace: {
          success: true,
          message: null,
          traceId: 'test-trace-id',
        },
      },
    });
  });
});
