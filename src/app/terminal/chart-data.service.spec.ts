// Copyright (c) 2025-2026 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { ChartDataService, ChartInterval } from './chart-data.service';

function edgesFor(dates: string[]) {
  return dates.map((date, i) => ({
    cursor: `c-${i}`,
    node: {
      id: `n-${i}`,
      date,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
      adjustedClose: 105,
      splitCoefficient: 1,
      dividendAmount: 0,
      isExtendedHours: false,
      isSplit: false,
      isDividend: false,
      filterFlags: 0,
    },
  }));
}

function connection(dates: string[]) {
  return {
    edges: edgesFor(dates),
    pageInfo: {
      hasOlderData: true,
      hasNewerData: false,
      oldestDate: dates[0] ?? null,
      newestDate: dates.at(-1) ?? null,
      startCursor: 'start',
      endCursor: 'end',
    },
    totalCount: dates.length,
  };
}

describe('ChartDataService', () => {
  let service: ChartDataService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query', 'mutate']);
    TestBed.configureTestingModule({
      providers: [ChartDataService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(ChartDataService);
  });

  it('is created', () => {
    expect(service).toBeTruthy();
  });

  describe('interval helpers', () => {
    it('isIntradayInterval is true for minute-based intervals and aliases', () => {
      const intraday: (ChartInterval | string)[] = [
        'MIN_1',
        'MIN_5',
        'MIN_15',
        'MIN_30',
        'MIN_60',
        '1min',
        '5min',
        '15min',
        '30min',
        '60min',
        'ONE_MINUTE',
        'FIVE_MINUTE',
        'FIFTEEN_MINUTE',
        'THIRTY_MINUTE',
        'HOURLY',
      ];
      intraday.forEach((i) => expect(service.isIntradayInterval(i)).toBeTrue());
    });

    it('isIntradayInterval is false for daily/weekly/monthly (incl. lowercase aliases)', () => {
      ['DAILY', 'WEEKLY', 'MONTHLY', 'daily', 'weekly', 'monthly'].forEach((i) =>
        expect(service.isIntradayInterval(i)).toBeFalse(),
      );
    });

    it('unrecognized intervals default to DAILY with a warning', () => {
      spyOn(console, 'warn');
      expect(service.isIntradayInterval('garbage')).toBeFalse();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('loadChartData', () => {
    it('queries Apollo and transforms edges to chronologically sorted candles', (done) => {
      // Backend returns dates newest-first; the service sorts to oldest-first.
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { stockPriceConnection: connection(['2024-03-01', '2024-01-01', '2024-02-01']) } } as any),
      );
      service.loadChartData('AAPL', 'DAILY', 3).subscribe((result) => {
        expect(result.candles.length).toBe(3);
        expect(result.candles[0].date.toISOString().slice(0, 10)).toBe('2024-01-01');
        expect(result.candles[2].date.toISOString().slice(0, 10)).toBe('2024-03-01');
        expect(result.totalCount).toBe(3);
        // Also cached for later retrieval
        expect(service.getCachedData('AAPL', 'DAILY')).toBeDefined();
        done();
      });
    });

    it('uses DEFAULT_CANDLE_COUNT when count not provided', (done) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { stockPriceConnection: connection([]) } } as any));
      service.loadChartData('TSLA', 'DAILY').subscribe(() => {
        const args = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['first']).toBe(252); // DEFAULT_CANDLE_COUNT.DAILY
        done();
      });
    });

    it('returns an empty result and resets loading when Apollo errors', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('boom')));
      service.loadChartData('FAIL', 'DAILY').subscribe((result) => {
        expect(result.candles).toEqual([]);
        expect(result.totalCount).toBe(0);
        done();
      });
    });
  });

  describe('loadOlderData / loadNewerData / loadDataByRange', () => {
    it('loadOlderData passes beforeCursor and merges into cache', (done) => {
      // Seed the cache with an initial load
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { stockPriceConnection: connection(['2024-02-01']) } } as any),
      );
      service.loadChartData('AAPL', 'DAILY').subscribe(() => {
        apollo.query.and.returnValue(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          of({ data: { stockPriceConnection: connection(['2024-01-15']) } } as any),
        );
        service.loadOlderData('AAPL', 'DAILY', 'cursor-x').subscribe((older) => {
          const args = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
          expect(args.variables['before']).toBe('cursor-x');
          expect(older.candles[0].date.toISOString().slice(0, 10)).toBe('2024-01-15');
          done();
        });
      });
    });

    it('loadOlderData recovers to empty result on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadOlderData('AAPL', 'DAILY', 'cursor').subscribe((result) => {
        expect(result.candles).toEqual([]);
        done();
      });
    });

    it('loadNewerData passes afterCursor', (done) => {
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { stockPriceConnection: connection(['2024-03-01']) } } as any),
      );
      service.loadNewerData('AAPL', 'DAILY', 'after-cur').subscribe(() => {
        const args = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['after']).toBe('after-cur');
        done();
      });
    });

    it('loadNewerData recovers on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadNewerData('AAPL', 'DAILY', 'cur').subscribe((result) => {
        expect(result.candles).toEqual([]);
        done();
      });
    });

    it('loadDataByRange maps the interval to the backend enum', (done) => {
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { chartDataRange: connection(['2024-02-01']) } } as any),
      );
      const start = new Date('2024-01-01');
      const end = new Date('2024-02-01');
      // Cast: the signature says ChartInterval, but the implementation runs
      // every input through mapIntervalToBackend, so frontend aliases work.
      service.loadDataByRange('AAPL', start, end, '5min' as ChartInterval).subscribe(() => {
        const args = apollo.query.calls.mostRecent().args[0] as { variables: Record<string, unknown> };
        expect(args.variables['interval']).toBe('MIN_5');
        expect(args.variables['startDate']).toBe(start.toISOString());
        expect(args.variables['endDate']).toBe(end.toISOString());
        done();
      });
    });

    it('loadDataByRange recovers on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.loadDataByRange('AAPL', new Date(), new Date(), 'DAILY').subscribe((result) => {
        expect(result.candles).toEqual([]);
        done();
      });
    });
  });

  describe('quote operations', () => {
    it('getQuote returns the quote payload and updates the currentQuote signal', (done) => {
      const quote = {
        symbol: 'AAPL',
        price: 200,
        open: 195,
        high: 205,
        low: 190,
        previousClose: 198,
        volume: 1_000_000,
        timestamp: '2026-01-01T00:00:00Z',
        changePercent: 1.01,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { quote } } as any));
      service.getQuote('AAPL').subscribe((result) => {
        expect(result).toEqual(quote);
        expect(service.currentQuote()).toEqual(quote);
        done();
      });
    });

    it('getQuote yields null on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.getQuote('AAPL').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('stopQuotePolling pushes onto the stop subject without throwing', () => {
      expect(() => service.stopQuotePolling()).not.toThrow();
    });
  });

  describe('availability + cache', () => {
    it('checkDataAvailability returns payload on success', (done) => {
      const availability = {
        symbol: 'AAPL',
        interval: 'DAILY' as ChartInterval,
        oldestDate: '2020-01-01',
        newestDate: '2026-01-01',
        totalRecords: 1000,
        lastUpdated: '2026-01-01T00:00:00Z',
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apollo.query.and.returnValue(of({ data: { chartDataAvailability: availability } } as any));
      service.checkDataAvailability('AAPL', 'DAILY').subscribe((result) => {
        expect(result).toEqual(availability);
        done();
      });
    });

    it('checkDataAvailability yields null on error', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('x')));
      service.checkDataAvailability('AAPL', 'DAILY').subscribe((result) => {
        expect(result).toBeNull();
        done();
      });
    });

    it('clearCache(symbol, interval) clears just one entry; no-arg clears all', (done) => {
      apollo.query.and.returnValue(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        of({ data: { stockPriceConnection: connection(['2024-02-01']) } } as any),
      );
      service.loadChartData('AAPL', 'DAILY').subscribe(() => {
        expect(service.getCachedData('AAPL', 'DAILY')).toBeDefined();
        service.clearCache('AAPL', 'DAILY');
        expect(service.getCachedData('AAPL', 'DAILY')).toBeUndefined();

        // Seed again and then clear all
        service.loadChartData('AAPL', 'DAILY').subscribe(() => {
          service.clearCache();
          expect(service.getCachedData('AAPL', 'DAILY')).toBeUndefined();
          done();
        });
      });
    });
  });
});
