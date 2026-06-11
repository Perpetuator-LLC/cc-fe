// Copyright (c) 2026 Perpetuator LLC
import { PodcastsResult } from './podcasts.service';
import { RecentlyUsedPodcastsService } from './recently-used-podcasts.service';

function makePodcast(uuid: string, name: string | null = null, latestDate: string | null = null): PodcastsResult {
  return { uuid, name, latestInternalEpisodeDate: latestDate } as PodcastsResult;
}

describe('RecentlyUsedPodcastsService', () => {
  const HISTORY_KEY = 'podcast-selection-history';
  let service: RecentlyUsedPodcastsService;

  beforeEach(() => {
    localStorage.removeItem(HISTORY_KEY);
    service = new RecentlyUsedPodcastsService();
  });

  afterEach(() => {
    localStorage.removeItem(HISTORY_KEY);
  });

  describe('loadHistory', () => {
    it('returns an empty history when nothing is stored', (done) => {
      service.loadHistory().subscribe((history) => {
        expect(history).toEqual([]);
        done();
      });
    });

    it('loads stored history and caches it', (done) => {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(['a', 'b']));
      service.loadHistory().subscribe((history) => {
        expect(history).toEqual(['a', 'b']);
        // Mutating storage after the first load must not change the cache.
        localStorage.setItem(HISTORY_KEY, JSON.stringify(['z']));
        service.loadHistory().subscribe((cached) => {
          expect(cached).toEqual(['a', 'b']);
          done();
        });
      });
    });

    it('recovers from corrupted JSON with an empty history', (done) => {
      const error = spyOn(console, 'error');
      localStorage.setItem(HISTORY_KEY, '{not json');
      service.loadHistory().subscribe((history) => {
        expect(history).toEqual([]);
        expect(error).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('recordSelection', () => {
    it('adds selections to the front and dedupes', () => {
      service.recordSelection('a');
      service.recordSelection('b');
      service.recordSelection('a');
      expect(service.getHistory()).toEqual(['a', 'b']);
      expect(JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]')).toEqual(['a', 'b']);
    });

    it('caps the history at 10 entries', () => {
      for (let i = 0; i < 12; i++) {
        service.recordSelection(`uuid-${i}`);
      }
      const history = service.getHistory();
      expect(history.length).toBe(10);
      expect(history[0]).toBe('uuid-11');
      expect(history).not.toContain('uuid-0');
      expect(history).not.toContain('uuid-1');
    });
  });

  describe('sortByRecentlyUsed', () => {
    it('returns empty input unchanged', () => {
      expect(service.sortByRecentlyUsed([])).toEqual([]);
    });

    it('puts recently used podcasts first, in history order', () => {
      service.recordSelection('old');
      service.recordSelection('new');
      const sorted = service.sortByRecentlyUsed([makePodcast('other'), makePodcast('old'), makePodcast('new')]);
      expect(sorted.map((p) => p.uuid)).toEqual(['new', 'old', 'other']);
    });

    it('sorts unselected podcasts by newest episode date, then name', () => {
      const sorted = service.sortByRecentlyUsed([
        makePodcast('c', 'Charlie', null),
        makePodcast('b', 'Bravo', '2026-01-01T00:00:00Z'),
        makePodcast('a', 'Alpha', null),
        makePodcast('d', 'Delta', '2026-03-01T00:00:00Z'),
      ]);
      expect(sorted.map((p) => p.uuid)).toEqual(['d', 'b', 'a', 'c']);
    });

    it('does not mutate the input array', () => {
      const input = [makePodcast('b', 'Bravo'), makePodcast('a', 'Alpha')];
      service.sortByRecentlyUsed(input);
      expect(input.map((p) => p.uuid)).toEqual(['b', 'a']);
    });
  });

  describe('getDefaultSelection', () => {
    it('returns null for an empty list', () => {
      expect(service.getDefaultSelection([])).toBeNull();
    });

    it('returns the only podcast when there is exactly one', () => {
      expect(service.getDefaultSelection([makePodcast('solo')])).toBe('solo');
    });

    it('prefers the most recently used podcast when present', () => {
      service.recordSelection('fav');
      expect(service.getDefaultSelection([makePodcast('x'), makePodcast('fav')])).toBe('fav');
    });

    it('falls back to the first podcast when history does not match', () => {
      service.recordSelection('gone');
      expect(service.getDefaultSelection([makePodcast('x'), makePodcast('y')])).toBe('x');
    });
  });
});
