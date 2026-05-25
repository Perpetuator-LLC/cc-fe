// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { JobDisplayService } from './job-display.service';
import { Job } from './jobs/job.service';
import { EpisodeService } from './episode/episode.service';
import { PodcastsService } from './podcast/podcasts.service';
import { ResearchService } from './topics/research.service';
import { BlogsService } from './blogs/blogs.service';
import { MessageService } from './message.service';

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: '1',
    uuid: 'job-uuid',
    kind: 'GENERIC',
    status: 'COMPLETED',
    error: '',
    result: null,
    args: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('JobDisplayService', () => {
  let service: JobDisplayService;
  let episodeService: jasmine.SpyObj<EpisodeService>;
  let podcastsService: jasmine.SpyObj<PodcastsService>;
  let researchService: jasmine.SpyObj<ResearchService>;
  let blogsService: jasmine.SpyObj<BlogsService>;
  let messageService: jasmine.SpyObj<MessageService>;

  beforeEach(() => {
    episodeService = jasmine.createSpyObj('EpisodeService', ['getEpisodeById']);
    podcastsService = jasmine.createSpyObj('PodcastsService', ['getPodcastById']);
    researchService = jasmine.createSpyObj('ResearchService', ['getTopicById']);
    blogsService = jasmine.createSpyObj('BlogsService', ['getArticle']);
    messageService = jasmine.createSpyObj('MessageService', ['success', 'error']);

    TestBed.configureTestingModule({
      providers: [
        JobDisplayService,
        { provide: EpisodeService, useValue: episodeService },
        { provide: PodcastsService, useValue: podcastsService },
        { provide: ResearchService, useValue: researchService },
        { provide: BlogsService, useValue: blogsService },
        { provide: MessageService, useValue: messageService },
      ],
    });
    service = TestBed.inject(JobDisplayService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('parseJobResult', () => {
    it('returns null when result is missing', () => {
      expect(service.parseJobResult(makeJob({ result: null }))).toBeNull();
    });

    it('returns object result with snake_case keys converted to camelCase', () => {
      const job = makeJob({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { podcast_uuid: 'p1', nested: { episode_uuid: 'e1' } } as any,
      });
      const parsed = service.parseJobResult(job);
      expect(parsed).toEqual(jasmine.objectContaining({ podcastUuid: 'p1' }));
      expect((parsed as Record<string, unknown>)['nested']).toEqual({ episodeUuid: 'e1' });
    });

    it('parses string JSON result and converts keys', () => {
      const job = makeJob({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: JSON.stringify({ episode_uuid: 'eee' }) as any,
      });
      const parsed = service.parseJobResult(job);
      expect(parsed?.episodeUuid).toBe('eee');
    });

    it('falls back to {message: raw} when result is non-JSON string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ result: 'not json' as any });
      expect(service.parseJobResult(job)).toEqual({ message: 'not json' });
    });

    it('returns null when JSON parses to a non-object (e.g., number)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ result: '42' as any });
      expect(service.parseJobResult(job)).toBeNull();
    });
  });

  describe('parseJobArgs', () => {
    it('returns null when args is missing', () => {
      expect(service.parseJobArgs(makeJob({ args: null }))).toBeNull();
    });

    it('returns object args with snake_case keys converted', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ args: { topic_uuid: 't1' } as any });
      expect(service.parseJobArgs(job)).toEqual(jasmine.objectContaining({ topicUuid: 't1' }));
    });

    it('parses string JSON args', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ args: JSON.stringify({ podcast_uuid: 'p' }) as any });
      expect(service.parseJobArgs(job)?.podcastUuid).toBe('p');
    });

    it('returns null for non-JSON args string', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ args: 'invalid' as any });
      expect(service.parseJobArgs(job)).toBeNull();
    });
  });

  describe('getJobMessage', () => {
    it('returns error string when present', () => {
      expect(service.getJobMessage(makeJob({ error: 'boom' }))).toBe('boom');
    });

    it('returns result.message when present', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.getJobMessage(makeJob({ result: { message: 'ok' } as any }))).toBe('ok');
    });

    it('stringifies result without message', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = service.getJobMessage(makeJob({ result: { foo: 'bar' } as any }));
      expect(msg).toContain('foo');
    });

    it('returns sentinel when no error/result', () => {
      expect(service.getJobMessage(makeJob({ result: null }))).toBe('No message available');
    });
  });

  describe('UUID accessor methods', () => {
    it('hasPodcastUuid / getPodcastUuid pull from result first, fall back to args', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const resJob = makeJob({ result: { podcast_uuid: 'p-res' } as any });
      expect(service.getPodcastUuid(resJob)).toBe('p-res');
      expect(service.hasPodcastUuid(resJob)).toBeTrue();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const argJob = makeJob({ args: { podcast_uuid: 'p-arg' } as any });
      expect(service.getPodcastUuid(argJob)).toBe('p-arg');

      expect(service.hasPodcastUuid(makeJob())).toBeFalse();
    });

    it('episode/topic/pulse/blog/article UUID helpers all resolve from result or args', () => {
      const job = makeJob({
        result: {
          episode_uuid: 'e1',
          topic_uuid: 't1',
          pulse_uuid: 'pu1',
          pulse_config_uuid: 'pc1',
          blog_uuid: 'b1',
          blog_name: 'My Blog',
          article_uuid: 'a1',
          article_title: 'Hello',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      });
      expect(service.getEpisodeUuid(job)).toBe('e1');
      expect(service.hasEpisodeUuid(job)).toBeTrue();
      expect(service.getTopicUuid(job)).toBe('t1');
      expect(service.hasTopicUuid(job)).toBeTrue();
      expect(service.getPulseUuid(job)).toBe('pu1');
      expect(service.hasPulseUuid(job)).toBeTrue();
      expect(service.getPulseConfigUuid(job)).toBe('pc1');
      expect(service.hasPulseConfigUuid(job)).toBeTrue();
      expect(service.getBlogUuid(job)).toBe('b1');
      expect(service.hasBlogUuid(job)).toBeTrue();
      expect(service.getBlogName(job)).toBe('My Blog');
      expect(service.getArticleUuid(job)).toBe('a1');
      expect(service.hasArticleUuid(job)).toBeTrue();
      expect(service.getArticleTitle(job)).toBe('Hello');
    });

    it('returns null/false when nothing is present', () => {
      const job = makeJob();
      expect(service.getEpisodeUuid(job)).toBeNull();
      expect(service.hasEpisodeUuid(job)).toBeFalse();
      expect(service.getTopicUuid(job)).toBeNull();
      expect(service.getPulseUuid(job)).toBeNull();
      expect(service.getPulseConfigUuid(job)).toBeNull();
      expect(service.getBlogUuid(job)).toBeNull();
      expect(service.getBlogName(job)).toBeNull();
      expect(service.getArticleUuid(job)).toBeNull();
      expect(service.getArticleTitle(job)).toBeNull();
    });
  });

  describe('symbol / FQN / exchange / interval', () => {
    it('parses symbol from fqn (STOCK:EXCHANGE:SYMBOL)', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ args: { fqn: 'STOCK:NASDAQ:AAPL' } as any });
      expect(service.getSymbol(job)).toBe('AAPL');
      expect(service.getExchange(job)).toBe('NASDAQ');
      expect(service.getFqn(job)).toBe('STOCK:NASDAQ:AAPL');
      expect(service.hasSymbol(job)).toBeTrue();
    });

    it('falls back to args.symbol when fqn missing', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ args: { symbol: 'TSLA' } as any });
      expect(service.getSymbol(job)).toBe('TSLA');
      expect(service.getExchange(job)).toBeNull();
      expect(service.hasSymbol(job)).toBeTrue();
    });

    it('returns short fqn unchanged when fewer than 3 parts', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ args: { fqn: 'X:Y' } as any });
      expect(service.getSymbol(job)).toBe('X:Y');
      expect(service.getExchange(job)).toBe('Y');
    });

    it('getInterval reads args.interval', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.getInterval(makeJob({ args: { interval: 'daily' } as any }))).toBe('daily');
      expect(service.getInterval(makeJob())).toBeNull();
    });

    it('hasSymbol returns false when neither symbol nor fqn present', () => {
      expect(service.hasSymbol(makeJob())).toBeFalse();
    });
  });

  describe('news UUIDs', () => {
    it('detects and returns news UUIDs from result', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ result: { news_uuids: ['n1', 'n2'] } as any });
      expect(service.hasNewsUuids(job)).toBeTrue();
      expect(service.getNewsUuids(job)).toEqual(['n1', 'n2']);
    });

    it('returns null/false when missing or empty', () => {
      expect(service.hasNewsUuids(makeJob())).toBeFalse();
      expect(service.getNewsUuids(makeJob())).toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(service.hasNewsUuids(makeJob({ result: { news_uuids: [] } as any }))).toBeFalse();
    });
  });

  describe('handleJobCompletion dispatch', () => {
    it('falls through to default branch with generic success message', (done) => {
      service.handleJobCompletion(makeJob({ kind: 'FETCH_NEWS' })).subscribe(() => {
        expect(messageService.success).toHaveBeenCalledWith('Job completed: FETCH_NEWS');
        done();
      });
    });

    it('CREATE_EPISODE: success path reports episode title', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      episodeService.getEpisodeById.and.returnValue(of({ uuid: 'e1', title: 'My Episode' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'CREATE_EPISODE', result: { episode_uuid: 'e1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success).toHaveBeenCalled();
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('My Episode');
        expect(msg).toContain('/media/episodes/e1');
        done();
      });
    });

    it('CREATE_EPISODE: blank title renders as (Blank)', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      episodeService.getEpisodeById.and.returnValue(of({ uuid: 'e1', title: '' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'CREATE_EPISODE', result: { episode_uuid: 'e1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('(Blank)');
        done();
      });
    });

    it('CREATE_EPISODE: fetch failure still surfaces fallback link', (done) => {
      episodeService.getEpisodeById.and.returnValue(throwError(() => new Error('boom')));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'CREATE_EPISODE', result: { episode_uuid: 'e1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('View Episode');
        done();
      });
    });

    it('CREATE_EPISODE: missing UUID falls back to generic success', (done) => {
      service.handleJobCompletion(makeJob({ kind: 'CREATE_EPISODE' })).subscribe(() => {
        expect(messageService.success).toHaveBeenCalledWith('Episode created successfully');
        done();
      });
    });

    it('GENERATE_PODCAST: success path uses podcast.name', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      podcastsService.getPodcastById.and.returnValue(of({ uuid: 'p1', name: 'Pod' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'GENERATE_PODCAST', result: { podcast_uuid: 'p1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('Pod');
        done();
      });
    });

    it('GENERATE_PODCAST: missing name renders (Unnamed Podcast)', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      podcastsService.getPodcastById.and.returnValue(of({ uuid: 'p1', name: '' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'GENERATE_PODCAST', result: { podcast_uuid: 'p1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('(Unnamed Podcast)');
        done();
      });
    });

    it('GENERATE_PODCAST: fetch error falls back to View Podcast link', (done) => {
      podcastsService.getPodcastById.and.returnValue(throwError(() => new Error('x')));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'GENERATE_PODCAST', result: { podcast_uuid: 'p1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('View Podcast');
        done();
      });
    });

    it('GENERATE_PODCAST: no UUID -> generic message', (done) => {
      service.handleJobCompletion(makeJob({ kind: 'GENERATE_PODCAST' })).subscribe(() => {
        expect(messageService.success).toHaveBeenCalledWith('Podcast generated successfully');
        done();
      });
    });

    it('GENERATE_RESEARCH_TRANSCRIPT: topic + episode combined message', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      researchService.getTopicById.and.returnValue(of({ uuid: 't1', title: 'TopicTitle' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      episodeService.getEpisodeById.and.returnValue(of({ uuid: 'e1', title: 'EpisodeTitle' } as any));
      const job = makeJob({
        kind: 'GENERATE_RESEARCH_TRANSCRIPT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { topic_uuid: 't1', episode_uuid: 'e1' } as any,
      });
      service.handleJobCompletion(job).subscribe(() => {
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('TopicTitle');
        expect(msg).toContain('EpisodeTitle');
        done();
      });
    });

    it('GENERATE_RESEARCH_TRANSCRIPT: topic only', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      researchService.getTopicById.and.returnValue(of({ uuid: 't1', title: 'TT' } as any));
      const job = makeJob({
        kind: 'GENERATE_RESEARCH_TRANSCRIPT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { topic_uuid: 't1' } as any,
      });
      service.handleJobCompletion(job).subscribe(() => {
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('TT');
        expect(msg).not.toContain('Episode:');
        done();
      });
    });

    it('GENERATE_RESEARCH_TRANSCRIPT: episode UUID present but fetch fails uses View Episode link', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      researchService.getTopicById.and.returnValue(of({ uuid: 't1', title: 'TT' } as any));
      episodeService.getEpisodeById.and.returnValue(throwError(() => new Error('nope')));
      const job = makeJob({
        kind: 'GENERATE_RESEARCH_TRANSCRIPT',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { topic_uuid: 't1', episode_uuid: 'e1' } as any,
      });
      service.handleJobCompletion(job).subscribe(() => {
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('View Episode');
        done();
      });
    });

    it('GENERATE_RESEARCH_TRANSCRIPT: missing topic UUID falls back to topics index', (done) => {
      service.handleJobCompletion(makeJob({ kind: 'GENERATE_RESEARCH_TRANSCRIPT' })).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('View Research Topics');
        done();
      });
    });

    it('RESEARCH_TOPIC: success path shows topic title', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      researchService.getTopicById.and.returnValue(of({ uuid: 't1', title: 'TopicX' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'RESEARCH_TOPIC', result: { topic_uuid: 't1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('TopicX');
        done();
      });
    });

    it('RESEARCH_TOPIC: missing topic UUID -> simple message', (done) => {
      service.handleJobCompletion(makeJob({ kind: 'RESEARCH_TOPIC' })).subscribe(() => {
        expect(messageService.success).toHaveBeenCalledWith('Research topic job completed');
        done();
      });
    });

    it('RESEARCH_TOPIC: fetch failure -> View Topic fallback', (done) => {
      researchService.getTopicById.and.returnValue(throwError(() => new Error('x')));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = makeJob({ kind: 'RESEARCH_TOPIC', result: { topic_uuid: 't1' } as any });
      service.handleJobCompletion(job).subscribe(() => {
        expect(messageService.success.calls.mostRecent().args[0]).toContain('View Topic');
        done();
      });
    });

    it('GENERATE_ARTICLE_FROM_EPISODE: combined article + episode link', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blogsService.getArticle.and.returnValue(of({ uuid: 'a1', title: 'ArtTitle' } as any));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      episodeService.getEpisodeById.and.returnValue(of({ uuid: 'e1', title: 'EpTitle' } as any));
      const job = makeJob({
        kind: 'GENERATE_ARTICLE_FROM_EPISODE',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { article_uuid: 'a1', episode_uuid: 'e1' } as any,
      });
      service.handleJobCompletion(job).subscribe(() => {
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('ArtTitle');
        expect(msg).toContain('EpTitle');
        done();
      });
    });

    it('GENERATE_ARTICLE_FROM_SOURCE: article only', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blogsService.getArticle.and.returnValue(of({ uuid: 'a1', title: 'ArtTitle' } as any));
      const job = makeJob({
        kind: 'GENERATE_ARTICLE_FROM_SOURCE',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { article_uuid: 'a1' } as any,
      });
      service.handleJobCompletion(job).subscribe(() => {
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('ArtTitle');
        expect(msg).not.toContain('From episode:');
        done();
      });
    });

    it('GENERATE_ARTICLE_FROM_SOURCE: missing article UUID falls through', (done) => {
      service.handleJobCompletion(makeJob({ kind: 'GENERATE_ARTICLE_FROM_SOURCE' })).subscribe(() => {
        expect(messageService.success).toHaveBeenCalledWith('Article generated successfully');
        done();
      });
    });

    it('GENERATE_ARTICLE_FROM_SOURCE: inner article failure renders "Article" placeholder', (done) => {
      // Inner per-stream catchError converts the failure to of(null), so the
      // forkJoin still resolves and the message renders the placeholder title.
      blogsService.getArticle.and.returnValue(throwError(() => new Error('x')));
      const job = makeJob({
        kind: 'GENERATE_ARTICLE_FROM_SOURCE',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result: { article_uuid: 'a1' } as any,
      });
      service.handleJobCompletion(job).subscribe(() => {
        const msg = messageService.success.calls.mostRecent().args[0];
        expect(msg).toContain('/media/articles/a1');
        expect(msg).toContain('>Article</a>');
        done();
      });
    });
  });
});
