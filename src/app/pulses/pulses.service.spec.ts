// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { ErrorHandlerService } from '../utils/error-handler.service';
import { PulsesService } from './pulses.service';

describe('PulsesService', () => {
  let service: PulsesService;
  let apollo: jasmine.SpyObj<Apollo>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        PulsesService,
        { provide: Apollo, useValue: apollo },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(PulsesService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  function queryReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.query.and.returnValue(of({ data: payload } as any));
  }
  function mutationReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.mutate.and.returnValue(of({ data: payload } as any));
  }
  function lastQueryVars(): Record<string, unknown> {
    const opts = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
    return opts.variables;
  }
  function lastMutationVars(): Record<string, unknown> {
    const opts = apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
    return opts.variables;
  }

  // -------- Queries -----------------------------------------------------------

  describe('queries', () => {
    it('getPulseConfigs unwraps edges and forwards filters', (done) => {
      queryReturns({
        pulseConfigs: {
          edges: [{ node: { uuid: 'pc1' } }, { node: { uuid: 'pc2' } }],
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'a', endCursor: 'z' },
          totalCount: 2,
        },
      });
      service.getPulseConfigs(50, 'cursor', 'search', true, 'name').subscribe((result) => {
        expect(result.pulseConfigs.length).toBe(2);
        expect(result.totalCount).toBe(2);
        expect(lastQueryVars()).toEqual({
          first: 50,
          after: 'cursor',
          search: 'search',
          isActive: true,
          orderBy: 'name',
        });
        done();
      });
    });

    it('getPulseConfig unwraps single config', (done) => {
      queryReturns({ pulseConfig: { uuid: 'pc1' } });
      service.getPulseConfig('pc1').subscribe((result) => {
        expect(result.uuid).toBe('pc1');
        expect(lastQueryVars()).toEqual({ uuid: 'pc1' });
        done();
      });
    });

    it('getPulses unwraps edges and forwards filters', (done) => {
      queryReturns({
        pulses: {
          edges: [{ node: { uuid: 'p1' } }],
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
          totalCount: 1,
        },
      });
      service.getPulses('pc1', 'COMPLETED', 'q', 5, null).subscribe((result) => {
        expect(result.pulses.length).toBe(1);
        expect(lastQueryVars()).toEqual({
          configUuid: 'pc1',
          status: 'COMPLETED',
          search: 'q',
          first: 5,
          after: null,
        });
        done();
      });
    });

    it('getPulse unwraps single pulse', (done) => {
      queryReturns({ pulse: { uuid: 'p1' } });
      service.getPulse('p1').subscribe((result) => {
        expect(result.uuid).toBe('p1');
        done();
      });
    });

    it('searchRssFeeds passes query + limit and falls back to []', (done) => {
      queryReturns({ searchRssFeeds: [{ uuid: 'rss1' }] });
      service.searchRssFeeds('finance', 10).subscribe((result) => {
        expect(result.length).toBe(1);
        // Service always pins onlyValid=true for fresh results
        expect(lastQueryVars()).toEqual({ query: 'finance', limit: 10, onlyValid: true });
        queryReturns({});
        service.searchRssFeeds('x').subscribe((empty) => {
          expect(empty).toEqual([]);
          done();
        });
      });
    });

    it('getAllRssFeeds forwards onlyValid and falls back to []', (done) => {
      queryReturns({ rssFeedsList: [{ uuid: 'rss1' }] });
      service.getAllRssFeeds(false).subscribe(() => {
        expect(lastQueryVars()).toEqual({ onlyValid: false });
        queryReturns({});
        service.getAllRssFeeds().subscribe((empty) => {
          expect(empty).toEqual([]);
          done();
        });
      });
    });
  });

  // -------- Mutations ---------------------------------------------------------

  describe('mutations', () => {
    it('createPulseConfig returns payload on success', (done) => {
      mutationReturns({
        createPulseConfig: { success: true, message: 'ok', pulseConfig: { uuid: 'pc1' } },
      });
      service.createPulseConfig({ name: 'Pulse' }).subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(lastMutationVars()['name']).toBe('Pulse');
        done();
      });
    });

    it('createPulseConfig throws on failure', (done) => {
      mutationReturns({
        createPulseConfig: { success: false, message: 'bad', pulseConfig: null },
      });
      service.createPulseConfig({ name: 'X' }).subscribe({
        error: (err) => {
          expect(err.message).toBe('bad');
          done();
        },
      });
    });

    it('generatePulseFromDescription forwards description', (done) => {
      mutationReturns({
        generatePulseFromDescription: {
          success: true,
          message: 'ok',
          job: { uuid: 'j1', status: 'PENDING' },
        },
      });
      service
        .generatePulseFromDescription({ description: 'morning news', smsNotificationEnabled: true })
        .subscribe(() => {
          const vars = lastMutationVars();
          expect(vars['description']).toBe('morning news');
          expect(vars['smsNotificationEnabled']).toBe(true);
          done();
        });
    });

    it('generatePulseFromDescription throws on failure', (done) => {
      mutationReturns({
        generatePulseFromDescription: { success: false, message: 'nope', job: null },
      });
      service.generatePulseFromDescription({ description: 'x' }).subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('updatePulseConfig merges updates into variables', (done) => {
      mutationReturns({
        updatePulseConfig: { success: true, message: 'ok', pulseConfig: { uuid: 'pc1' } },
      });
      service.updatePulseConfig('pc1', { name: 'New Name', isActive: false }).subscribe(() => {
        const vars = lastMutationVars();
        expect(vars['pulseConfigUuid']).toBe('pc1');
        expect(vars['name']).toBe('New Name');
        expect(vars['isActive']).toBe(false);
        done();
      });
    });

    it('updatePulseConfig throws on failure', (done) => {
      mutationReturns({
        updatePulseConfig: { success: false, message: 'nope', pulseConfig: null },
      });
      service.updatePulseConfig('pc1', {}).subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('deletePulseConfig returns success/failure cleanly', (done) => {
      mutationReturns({ deletePulseConfig: { success: true, message: 'gone' } });
      service.deletePulseConfig('pc1').subscribe((res) => {
        expect(res.success).toBeTrue();
        mutationReturns({ deletePulseConfig: { success: false, message: 'nope' } });
        service.deletePulseConfig('pc1').subscribe({
          error: (err) => {
            expect(err.message).toBe('nope');
            done();
          },
        });
      });
    });

    it('removeContentSource forwards uuid + success/error paths', (done) => {
      mutationReturns({ removeContentSource: { success: true, message: 'gone' } });
      service.removeContentSource('cs1').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(lastMutationVars()).toEqual({ contentSourceUuid: 'cs1' });
        mutationReturns({ removeContentSource: { success: false, message: 'nope' } });
        service.removeContentSource('cs1').subscribe({
          error: (err) => {
            expect(err.message).toBe('nope');
            done();
          },
        });
      });
    });

    it('removeAlertTrigger forwards uuid + success/error paths', (done) => {
      mutationReturns({ removeAlertTrigger: { success: true, message: 'gone' } });
      service.removeAlertTrigger('at1').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(lastMutationVars()).toEqual({ alertTriggerUuid: 'at1' });
        mutationReturns({ removeAlertTrigger: { success: false, message: 'nope' } });
        service.removeAlertTrigger('at1').subscribe({
          error: (err) => {
            expect(err.message).toBe('nope');
            done();
          },
        });
      });
    });

    it('generatePulse forwards config uuid + handles failure', (done) => {
      mutationReturns({
        generatePulse: { success: true, message: 'ok', jobUuid: 'j1', jobUuids: ['j1'] },
      });
      service.generatePulse('pc1').subscribe((res) => {
        expect(res.success).toBeTrue();
        expect(lastMutationVars()).toEqual({ pulseConfigUuid: 'pc1' });
        mutationReturns({
          generatePulse: { success: false, message: 'nope', jobUuid: null, jobUuids: [] },
        });
        service.generatePulse('pc1').subscribe({
          error: (err) => {
            expect(err.message).toBe('nope');
            done();
          },
        });
      });
    });

    it('generateTextToSpeech forwards all options', (done) => {
      mutationReturns({
        generateTextToSpeech: { success: true, message: 'ok', pulse: { uuid: 'p1' }, jobUuid: 'j1' },
      });
      service.generateTextToSpeech('hello', 'Title', 'voice-1', false).subscribe(() => {
        const vars = lastMutationVars();
        expect(vars['text']).toBe('hello');
        expect(vars['title']).toBe('Title');
        expect(vars['voiceUuid']).toBe('voice-1');
        expect(vars['convertToTranscript']).toBe(false);
        done();
      });
    });

    it('generateTextToSpeech throws on failure', (done) => {
      mutationReturns({
        generateTextToSpeech: { success: false, message: 'nope', pulse: null, jobUuid: null },
      });
      service.generateTextToSpeech('hello').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('createRecording forwards config + title + text', (done) => {
      mutationReturns({
        createRecording: { success: true, message: 'ok', pulse: { uuid: 'p1' }, jobUuid: 'j1' },
      });
      service.createRecording('pc1', 'Title', 'Body').subscribe(() => {
        const vars = lastMutationVars();
        expect(vars['pulseConfigUuid']).toBe('pc1');
        expect(vars['title']).toBe('Title');
        expect(vars['text']).toBe('Body');
        // convertToTranscript defaults to true
        expect(vars['convertToTranscript']).toBe(true);
        done();
      });
    });

    it('createRecording throws on failure', (done) => {
      mutationReturns({
        createRecording: { success: false, message: 'nope', pulse: null, jobUuid: null },
      });
      service.createRecording('pc1', 'T', 'b').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('deliverPulse forwards pulse uuid + optional delivery method', (done) => {
      mutationReturns({
        deliverPulse: {
          success: true,
          message: 'ok',
          delivery: { uuid: 'd1', sentAt: '2026-01-01', wasSuccessful: true },
        },
      });
      service.deliverPulse('p1').subscribe(() => {
        expect(lastMutationVars()['pulseUuid']).toBe('p1');
        done();
      });
    });

    it('deliverPulse throws on failure', (done) => {
      mutationReturns({
        deliverPulse: { success: false, message: 'nope', delivery: null },
      });
      service.deliverPulse('p1').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });
  });
});
