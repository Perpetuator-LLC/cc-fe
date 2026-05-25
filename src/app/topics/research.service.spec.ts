// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of } from 'rxjs';
import { ResearchService } from './research.service';
import { ErrorHandlerService } from '../utils/error-handler.service';

describe('ResearchService', () => {
  let service: ResearchService;
  let apollo: jasmine.SpyObj<Apollo>;
  let errorHandler: jasmine.SpyObj<ErrorHandlerService>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    errorHandler = jasmine.createSpyObj<ErrorHandlerService>('ErrorHandlerService', ['handleError']);
    TestBed.configureTestingModule({
      providers: [
        ResearchService,
        { provide: Apollo, useValue: apollo },
        { provide: ErrorHandlerService, useValue: errorHandler },
      ],
    });
    service = TestBed.inject(ResearchService);
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
    return (apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
  }
  function lastMutationVars(): Record<string, unknown> {
    return (apollo.mutate.calls.mostRecent().args[0] as { variables: Record<string, unknown> }).variables;
  }

  describe('queries', () => {
    it('getTopics unwraps edges and forwards filters', (done) => {
      queryReturns({
        topics: {
          edges: [
            { cursor: 'c1', node: { uuid: 't1' } },
            { cursor: 'c2', node: { uuid: 't2' } },
          ],
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'c1', endCursor: 'c2' },
        },
      });
      service.getTopics('p1', 25, 'after').subscribe((result) => {
        expect(result.topics.length).toBe(2);
        expect(lastQueryVars()).toEqual({ podcastUuid: 'p1', first: 25, after: 'after' });
        done();
      });
    });

    it('getTopicById returns the single node', (done) => {
      queryReturns({
        topics: {
          edges: [{ cursor: 'c1', node: { uuid: 't1', title: 'My Topic' } }],
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'c1', endCursor: 'c1' },
        },
      });
      service.getTopicById('t1').subscribe((result) => {
        expect(result.uuid).toBe('t1');
        done();
      });
    });

    it('getTopicById throws when no edges returned', (done) => {
      queryReturns({
        topics: {
          edges: [],
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        },
      });
      service.getTopicById('t1').subscribe({
        error: (err) => {
          expect(err.message).toBe('Topic not found');
          done();
        },
      });
    });
  });

  describe('mutations', () => {
    it('createResearchChain returns payload on success', (done) => {
      mutationReturns({
        createResearchChain: { success: true, message: 'ok', jobs: [{ id: 'j1' }] },
      });
      service.createResearchChain('p1').subscribe((result) => {
        expect(result.success).toBeTrue();
        expect(lastMutationVars()).toEqual({ podcastUuid: 'p1' });
        done();
      });
    });

    it('createResearchChain throws on failure', (done) => {
      mutationReturns({ createResearchChain: { success: false, message: 'nope', jobs: [] } });
      service.createResearchChain('p1').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('createFullResearchChain forwards topic uuid', (done) => {
      mutationReturns({
        createFullResearchChain: { success: true, message: 'ok', jobs: [] },
      });
      service.createFullResearchChain('p1', 't1').subscribe(() => {
        expect(lastMutationVars()).toEqual({ podcastUuid: 'p1', topicUuid: 't1' });
        done();
      });
    });

    it('createFullResearchChain throws on failure', (done) => {
      mutationReturns({ createFullResearchChain: { success: false, message: 'nope', jobs: [] } });
      service.createFullResearchChain('p1').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('publishResearchTopicEpisodeChain forwards both uuids', (done) => {
      mutationReturns({
        publishResearchTopicEpisodeChain: { success: true, message: 'ok', jobs: [] },
      });
      service.publishResearchTopicEpisodeChain('p1', 't1').subscribe(() => {
        expect(lastMutationVars()).toEqual({ podcastUuid: 'p1', topicUuid: 't1' });
        done();
      });
    });

    it('publishResearchTopicEpisodeChain throws on failure', (done) => {
      mutationReturns({
        publishResearchTopicEpisodeChain: { success: false, message: 'nope', jobs: [] },
      });
      service.publishResearchTopicEpisodeChain('p1', 't1').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('createCustomTopic forwards title + description', (done) => {
      mutationReturns({
        createCustomTopic: { success: true, message: 'ok', topic: { uuid: 't1' } },
      });
      service.createCustomTopic('p1', 'Title', 'Desc').subscribe(() => {
        expect(lastMutationVars()).toEqual({ podcastUuid: 'p1', title: 'Title', description: 'Desc' });
        done();
      });
    });

    it('createCustomTopic throws on failure', (done) => {
      mutationReturns({ createCustomTopic: { success: false, message: 'nope', topic: null } });
      service.createCustomTopic('p1', 'T').subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });

    it('updateTopic merges updates into variables', (done) => {
      mutationReturns({
        updateTopic: { success: true, message: 'ok', topic: { uuid: 't1' } },
      });
      service.updateTopic('t1', { title: 'New', transcript: 'hello' }).subscribe(() => {
        const vars = lastMutationVars();
        expect(vars['topicUuid']).toBe('t1');
        expect(vars['title']).toBe('New');
        expect(vars['transcript']).toBe('hello');
        done();
      });
    });

    it('updateTopic throws on failure', (done) => {
      mutationReturns({ updateTopic: { success: false, message: 'nope', topic: null } });
      service.updateTopic('t1', { title: 'x' }).subscribe({
        error: (err) => {
          expect(err.message).toBe('nope');
          done();
        },
      });
    });
  });
});
