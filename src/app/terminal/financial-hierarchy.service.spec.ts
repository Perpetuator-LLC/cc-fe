// Copyright (c) 2026 Perpetuator LLC
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TestBed } from '@angular/core/testing';
import { Apollo } from 'apollo-angular';
import { of, throwError } from 'rxjs';
import { FinancialHierarchyData, FinancialHierarchyService, FinancialNode } from './financial-hierarchy.service';

function node(over: Partial<FinancialNode> = {}): FinancialNode {
  return {
    id: 'n1',
    name: 'Node',
    value: 100,
    previousValue: 50,
    yoyChange: 100,
    percentageOfParent: 0.25,
    percentageOfTotal: 0.1,
    level: 1,
    flags: [],
    children: [],
    ...over,
  };
}

describe('FinancialHierarchyService', () => {
  let service: FinancialHierarchyService;
  let apollo: jasmine.SpyObj<Apollo>;

  beforeEach(() => {
    apollo = jasmine.createSpyObj<Apollo>('Apollo', ['query']);
    apollo.query.and.returnValue(of({ data: { financialHierarchy: null } } as any));
    TestBed.configureTestingModule({
      providers: [FinancialHierarchyService, { provide: Apollo, useValue: apollo }],
    });
    service = TestBed.inject(FinancialHierarchyService);
  });

  it('is created with default signals', () => {
    expect(service.loading()).toBeFalse();
    expect(service.error()).toBeNull();
    expect(service.currentSymbol()).toBeNull();
    expect(service.hierarchyData()).toBeNull();
  });

  describe('formatValue', () => {
    it('returns N/A for null', () => {
      expect(service.formatValue(null)).toBe('N/A');
    });

    it('formats T/B/M and falls back to localeString for small values', () => {
      expect(service.formatValue(2.5e12)).toBe('$2.50T');
      expect(service.formatValue(1.5e9)).toBe('$1.50B');
      expect(service.formatValue(3.75e6)).toBe('$3.75M');
      expect(service.formatValue(1234)).toBe('$1,234');
    });

    it('uses absolute value for unit selection (keeps original sign)', () => {
      expect(service.formatValue(-1.5e9)).toBe('$-1.50B');
    });
  });

  describe('formatChange', () => {
    it('returns N/A for null', () => {
      expect(service.formatChange(null)).toBe('N/A');
    });

    it('prefixes + for non-negative and uses native sign for negative', () => {
      expect(service.formatChange(5)).toBe('+5.0%');
      expect(service.formatChange(0)).toBe('+0.0%');
      expect(service.formatChange(-2)).toBe('-2.0%');
    });
  });

  describe('findNode', () => {
    it('returns root when ID matches', () => {
      const root = node({ id: 'root' });
      expect(service.findNode(root, 'root')).toBe(root);
    });

    it('walks children depth-first', () => {
      const leaf = node({ id: 'leaf' });
      const branch = node({ id: 'branch', children: [leaf] });
      const root = node({ id: 'root', children: [branch] });
      expect(service.findNode(root, 'leaf')).toBe(leaf);
    });

    it('returns null when not found', () => {
      const root = node({ id: 'root', children: [node({ id: 'a' })] });
      expect(service.findNode(root, 'missing')).toBeNull();
    });
  });

  describe('getNodesWithFlag', () => {
    it('collects every node carrying the flag', () => {
      const a = node({ id: 'a', flags: ['m&a_indicator'] });
      const b = node({ id: 'b', flags: ['other'] });
      const c = node({ id: 'c', flags: ['m&a_indicator'] });
      const root = node({ id: 'root', flags: [], children: [a, b, c] });
      const flagged = service.getNodesWithFlag(root, 'm&a_indicator');
      expect(flagged.map((n) => n.id)).toEqual(['a', 'c']);
    });

    it('returns [] when no matching flags', () => {
      const root = node({ id: 'root', flags: [], children: [node()] });
      expect(service.getNodesWithFlag(root, 'missing')).toEqual([]);
    });

    it('handles deeply nested children', () => {
      const deep = node({ id: 'deep', flags: ['target'] });
      const mid = node({ id: 'mid', children: [deep] });
      const root = node({ id: 'root', children: [mid] });
      expect(service.getNodesWithFlag(root, 'target').map((n) => n.id)).toEqual(['deep']);
    });
  });

  describe('loadHierarchy', () => {
    it('returns hierarchy on success and updates signals', (done) => {
      const data: FinancialHierarchyData = {
        symbol: 'AAPL',
        reportType: 'balance_sheet',
        fiscalDateEnding: '2024-12-31',
        previousFiscalDate: '2023-12-31',
        root: node({ id: 'root' }),
        alerts: [],
      };
      apollo.query.and.returnValue(of({ data: { financialHierarchy: data } } as any));
      service.loadHierarchy('AAPL', 'balance_sheet').subscribe((result) => {
        expect(result).toEqual(data);
        expect(service.loading()).toBeFalse();
        expect(service.currentSymbol()).toBe('AAPL');
        expect(service.hierarchyData()).toEqual(data);
        expect(service.error()).toBeNull();
        done();
      });
    });

    it('sets an error message and returns null when data is missing', (done) => {
      apollo.query.and.returnValue(of({ data: { financialHierarchy: null } } as any));
      service.loadHierarchy('X', 'income_statement', 2024, false).subscribe((result) => {
        expect(result).toBeNull();
        expect(service.error()).toContain('No financial hierarchy data');
        done();
      });
    });

    it('catches errors and surfaces the message on the signal', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('boom')));
      spyOn(console, 'error');
      service.loadHierarchy('X', 'cash_flow').subscribe((result) => {
        expect(result).toBeNull();
        expect(service.error()).toContain('boom');
        expect(service.loading()).toBeFalse();
        done();
      });
    });
  });

  describe('loadNodeTimeSeries', () => {
    it('returns the points on success', (done) => {
      const points = [{ fiscalDateEnding: '2024-12-31', value: 10, percentageOfTotal: null, yoyChange: null }];
      apollo.query.and.returnValue(of({ data: { financialNodeTimeSeries: points } } as any));
      service.loadNodeTimeSeries('AAPL', 'node-1').subscribe((result) => {
        expect(result).toEqual(points);
        done();
      });
    });

    it('returns [] when data is null', (done) => {
      apollo.query.and.returnValue(of({ data: { financialNodeTimeSeries: null } } as any));
      service.loadNodeTimeSeries('AAPL', 'n').subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('returns [] when the query errors', (done) => {
      apollo.query.and.returnValue(throwError(() => new Error('500')));
      spyOn(console, 'error');
      service.loadNodeTimeSeries('AAPL', 'n').subscribe((result) => {
        expect(result).toEqual([]);
        done();
      });
    });
  });
});
