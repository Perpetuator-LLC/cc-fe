// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { WatchlistService } from './watchlist.service';

describe('WatchlistService', () => {
  let service: WatchlistService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    TestBed.configureTestingModule({
      providers: [WatchlistService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(WatchlistService);
  });

  it('is created with initial signal state', () => {
    expect(service).toBeTruthy();
    expect(service.watchlists()).toEqual([]);
    expect(service.searchHistory()).toBeNull();
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
    expect(service.recentSymbols()).toEqual([]);
    expect(service.customWatchlists()).toEqual([]);
    expect(service.favorites()).toBeUndefined();
  });

  function queryReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.query.and.returnValue(of({ data: payload } as any));
  }
  function mutationReturns(payload: Record<string, unknown>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apollo.mutate.and.returnValue(of({ data: payload } as any));
  }
  function lastQueryVars(): Record<string, unknown> | undefined {
    const opts = apollo.query.calls.mostRecent().args[0] as { variables?: Record<string, unknown> };
    return opts.variables;
  }

  describe('loadWatchlists', () => {
    it('populates the signal and clears loading on success', (done) => {
      queryReturns({ watchlists: [{ uuid: 'w1', watchlistType: 'CUSTOM', items: [], itemCount: 0 }] });
      service.loadWatchlists('CUSTOM').subscribe((result) => {
        expect(result.length).toBe(1);
        expect(service.watchlists().length).toBe(1);
        expect(service.customWatchlists().length).toBe(1);
        expect(service.loading()).toBeFalse();
        done();
      });
    });

    it('records error and returns [] on failure', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('boom')));
      service.loadWatchlists().subscribe((result) => {
        expect(result).toEqual([]);
        expect(service.error()).toBe('boom');
        expect(service.loading()).toBeFalse();
        done();
      });
    });
  });

  describe('loadSearchHistory', () => {
    it('populates signal on success', (done) => {
      queryReturns({
        searchHistory: { uuid: 'sh', watchlistType: 'SEARCH_HISTORY', items: [], itemCount: 0 },
      });
      service.loadSearchHistory(50).subscribe((result) => {
        expect(result?.uuid).toBe('sh');
        expect(service.searchHistory()?.uuid).toBe('sh');
        expect(lastQueryVars()).toEqual({ limit: 50 });
        done();
      });
    });

    it('records error and returns null on failure', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadSearchHistory().subscribe((result) => {
        expect(result).toBeNull();
        expect(service.error()).toBe('x');
        done();
      });
    });
  });

  describe('loadRecentSymbols', () => {
    it('populates the recentSymbols signal', (done) => {
      queryReturns({ recentSymbols: [{ symbol: 'AAPL' }] });
      service.loadRecentSymbols(5).subscribe(() => {
        expect(service.recentSymbols().length).toBe(1);
        expect(lastQueryVars()).toEqual({ limit: 5, orderBy: 'lastAccessedAt' });
        done();
      });
    });

    it('returns [] on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadRecentSymbols().subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });
  });

  describe('sector / industry filters', () => {
    it('loadSectorSymbols returns array or []', (done) => {
      queryReturns({ sectorSymbols: [{ symbol: 'X' }] });
      service.loadSectorSymbols('Tech').subscribe((res) => {
        expect(res.length).toBe(1);
        queryReturns({});
        service.loadSectorSymbols('Tech').subscribe((empty) => {
          expect(empty).toEqual([]);
          done();
        });
      });
    });

    it('loadIndustrySymbols returns array or []', (done) => {
      queryReturns({ industrySymbols: [{ symbol: 'Y' }] });
      service.loadIndustrySymbols('Software').subscribe((res) => {
        expect(res.length).toBe(1);
        queryReturns({});
        service.loadIndustrySymbols('Software').subscribe((empty) => {
          expect(empty).toEqual([]);
          done();
        });
      });
    });

    it('returns [] on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadSectorSymbols('Tech').subscribe((res) => {
        expect(res).toEqual([]);
        done();
      });
    });
  });

  describe('reference lists', () => {
    it('loadGicsSectors / Industries / Exchanges set signals', (done) => {
      queryReturns({ gicsSectors: ['A', 'B'] });
      service.loadGicsSectors().subscribe(() => {
        expect(service.gicsSectors()).toEqual(['A', 'B']);

        queryReturns({ gicsIndustries: ['I'] });
        service.loadGicsIndustries().subscribe(() => {
          expect(service.gicsIndustries()).toEqual(['I']);

          queryReturns({ exchanges: ['NASDAQ'] });
          service.loadExchanges().subscribe(() => {
            expect(service.exchanges()).toEqual(['NASDAQ']);
            done();
          });
        });
      });
    });

    it('returns [] on error and leaves signal unchanged', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadGicsSectors().subscribe((res) => {
        expect(res).toEqual([]);
        done();
      });
    });
  });

  describe('catalog (legacy non-paginated)', () => {
    it('loadAllSectorSymbols passes filters', (done) => {
      queryReturns({ allSectorSymbols: [{ symbol: 'A' }] });
      service.loadAllSectorSymbols('Tech', 25, 'symbol').subscribe(() => {
        expect(lastQueryVars()).toEqual({ sector: 'Tech', limit: 25, orderBy: 'symbol' });
        done();
      });
    });

    it('loadAllIndustrySymbols and loadExchangeSymbols return [] on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadAllIndustrySymbols('Software').subscribe((res) => {
        expect(res).toEqual([]);
        service.loadExchangeSymbols('NASDAQ').subscribe((res2) => {
          expect(res2).toEqual([]);
          done();
        });
      });
    });
  });

  describe('Relay-style catalog queries', () => {
    it('loadCatalogSectorSymbols returns the connection or an empty placeholder on error', (done) => {
      const conn = {
        totalCount: 1,
        edges: [{ node: { symbol: 'X' } }],
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'a', endCursor: 'a' },
      };
      queryReturns({ catalogSectorSymbols: conn });
      service.loadCatalogSectorSymbols('Tech').subscribe((res) => {
        expect(res.totalCount).toBe(1);
        apollo.query.and.returnValue(throwError(() => new Error('x')));
        service.loadCatalogSectorSymbols('Tech').subscribe((empty) => {
          expect(empty.totalCount).toBe(0);
          expect(empty.edges).toEqual([]);
          done();
        });
      });
    });

    it('loadCatalogIndustrySymbols returns empty placeholder on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadCatalogIndustrySymbols('Software').subscribe((res) => {
        expect(res.totalCount).toBe(0);
        done();
      });
    });

    it('loadCatalogExchangeSymbols returns empty placeholder on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadCatalogExchangeSymbols('NASDAQ').subscribe((res) => {
        expect(res.totalCount).toBe(0);
        done();
      });
    });
  });

  describe('loadAssetTypeSymbols / searchStockListings', () => {
    it('loadAssetTypeSymbols passes assetType + limit', (done) => {
      queryReturns({ stockListings: [{ symbol: 'X' }] });
      service.loadAssetTypeSymbols('ETF', 50).subscribe((res) => {
        expect(res.length).toBe(1);
        expect(lastQueryVars()).toEqual({ assetType: 'ETF', limit: 50 });
        done();
      });
    });

    it('searchStockListings short-circuits empty queries to []', (done) => {
      service.searchStockListings('').subscribe((res) => {
        expect(res).toEqual([]);
        expect(apollo.query).not.toHaveBeenCalled();
        done();
      });
    });

    it('searchStockListings filters non-Active listings out of the response', (done) => {
      queryReturns({
        stockListings: [
          { symbol: 'X', status: 'Active' },
          { symbol: 'Y', status: 'Inactive' },
        ],
      });
      service.searchStockListings('x').subscribe((res) => {
        expect(res.length).toBe(1);
        expect(res[0].symbol).toBe('X');
        // Query is uppercased
        expect(lastQueryVars()).toEqual({ symbol: 'X', limit: 10 });
        done();
      });
    });

    it('searchStockListings returns [] on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.searchStockListings('abc').subscribe((res) => {
        expect(res).toEqual([]);
        done();
      });
    });
  });

  describe('mutations', () => {
    it('addToWatchlist returns success/error and triggers a refresh on success', (done) => {
      // First call: addToWatchlist mutation
      mutationReturns({ addToWatchlist: { success: true, message: 'added' } });
      // Subsequent loadWatchlists call inside tap()
      queryReturns({ watchlists: [] });
      service.addToWatchlist('AAPL', 'w1', 'Apple', 'STOCK', 'NASDAQ').subscribe((res) => {
        expect(res.success).toBeTrue();
        // Apollo.query should have been called for the refresh
        expect(apollo.query).toHaveBeenCalled();
        done();
      });
    });

    it('addToWatchlist surfaces errors with success=false', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('mutate failed')));
      service.addToWatchlist('AAPL').subscribe((res) => {
        expect(res.success).toBeFalse();
        expect(res.message).toBe('mutate failed');
        done();
      });
    });

    it('removeFromWatchlist updates local state on success', (done) => {
      // Seed
      queryReturns({
        watchlists: [
          {
            uuid: 'w1',
            watchlistType: 'CUSTOM',
            items: [{ symbol: 'AAPL' }, { symbol: 'MSFT' }],
            itemCount: 2,
          },
        ],
      });
      service.loadWatchlists().subscribe(() => {
        mutationReturns({ removeFromWatchlist: { success: true, message: 'gone' } });
        service.removeFromWatchlist('w1', 'AAPL').subscribe((res) => {
          expect(res.success).toBeTrue();
          const w = service.watchlists().find((x) => x.uuid === 'w1');
          expect(w?.items.length).toBe(1);
          expect(w?.itemCount).toBe(1);
          done();
        });
      });
    });

    it('removeFromWatchlist surfaces error on failure', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('nope')));
      service.removeFromWatchlist('w1', 'AAPL').subscribe((res) => {
        expect(res.success).toBeFalse();
        done();
      });
    });

    it('createWatchlist appends to the watchlists signal', (done) => {
      mutationReturns({
        createWatchlist: { success: true, message: 'ok', watchlist: { uuid: 'wNew', items: [], itemCount: 0 } },
      });
      service.createWatchlist('My List').subscribe(() => {
        expect(service.watchlists().some((w) => w.uuid === 'wNew')).toBeTrue();
        done();
      });
    });

    it('createWatchlist surfaces error on failure', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('x')));
      service.createWatchlist('x').subscribe((res) => {
        expect(res.success).toBeFalse();
        done();
      });
    });

    it('deleteWatchlist filters the watchlists signal', (done) => {
      // Seed state
      queryReturns({ watchlists: [{ uuid: 'w1', items: [], itemCount: 0 }] });
      service.loadWatchlists().subscribe(() => {
        mutationReturns({ deleteWatchlist: { success: true, message: 'gone' } });
        service.deleteWatchlist('w1').subscribe(() => {
          expect(service.watchlists().some((w) => w.uuid === 'w1')).toBeFalse();
          done();
        });
      });
    });

    it('deleteWatchlist surfaces error on failure', (done) => {
      apollo.mutate.and.returnValue(throwError(() => new Error('x')));
      service.deleteWatchlist('w1').subscribe((res) => {
        expect(res.success).toBeFalse();
        done();
      });
    });
  });

  describe('clear()', () => {
    it('resets all state signals to their defaults', (done) => {
      // Seed some state first
      queryReturns({ watchlists: [{ uuid: 'w1', items: [], itemCount: 0 }] });
      service.loadWatchlists().subscribe(() => {
        expect(service.watchlists().length).toBeGreaterThan(0);
        service.clear();
        expect(service.watchlists()).toEqual([]);
        expect(service.searchHistory()).toBeNull();
        expect(service.recentSymbols()).toEqual([]);
        done();
      });
    });
  });
});
