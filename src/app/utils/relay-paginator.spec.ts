// Copyright (c) 2026 Perpetuator LLC
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { RelayPaginatorBase } from './relay-paginator';

interface LoadCall {
  pageSize: number;
  cursor: string | null;
  pageIndex: number;
}

class TestPaginator extends RelayPaginatorBase<string> {
  loads: LoadCall[] = [];

  protected loadPage(pageSize: number, cursor: string | null, pageIndex: number): void {
    this.loads.push({ pageSize, cursor, pageIndex });
  }
}

function pageEvent(pageIndex: number, pageSize: number): PageEvent {
  return { pageIndex, pageSize, length: 0 };
}

describe('RelayPaginatorBase', () => {
  let pager: TestPaginator;
  let firstPage: jasmine.Spy;

  beforeEach(() => {
    pager = new TestPaginator();
    firstPage = jasmine.createSpy('firstPage');
    pager.paginator = { firstPage } as unknown as MatPaginator;
  });

  it('ngAfterViewInit intentionally does not bind the paginator to the dataSource', () => {
    pager.ngAfterViewInit();
    expect(pager.dataSource.paginator).toBeFalsy();
  });

  describe('handlePageData', () => {
    it('stores data, the next cursor, and an open-ended total while more pages exist', () => {
      pager['handlePageData'](['a', 'b'], { hasNextPage: true, endCursor: 'cur-1' }, 0);
      expect(pager.dataSource.data).toEqual(['a', 'b']);
      expect(pager.cursors[1]).toBe('cur-1');
      // (pageIndex + 2) * pageSize keeps the Next button enabled.
      expect(pager.totalItems).toBe(20);
    });

    it('closes the total on the last page', () => {
      pager['handlePageData'](['a'], { hasNextPage: false, endCursor: null }, 2);
      expect(pager.cursors[3]).toBeNull();
      expect(pager.totalItems).toBe(30);
    });
  });

  describe('onPageChange', () => {
    it('loads the requested page with its stored cursor', () => {
      pager['handlePageData'](['a'], { hasNextPage: true, endCursor: 'cur-1' }, 0);
      pager.onPageChange(pageEvent(1, 10));
      expect(pager.loads).toEqual([{ pageSize: 10, cursor: 'cur-1', pageIndex: 1 }]);
      expect(firstPage).not.toHaveBeenCalled();
    });

    it('falls back to a null cursor for unknown pages', () => {
      pager.onPageChange(pageEvent(3, 10));
      expect(pager.loads).toEqual([{ pageSize: 10, cursor: null, pageIndex: 3 }]);
    });

    it('resets pagination when the page size changes', () => {
      pager['handlePageData'](['a'], { hasNextPage: true, endCursor: 'cur-1' }, 0);
      pager.onPageChange(pageEvent(1, 25));
      expect(pager.pageSize).toBe(25);
      expect(pager.cursors).toEqual([null]);
      expect(firstPage).toHaveBeenCalled();
      expect(pager.loads).toEqual([{ pageSize: 25, cursor: null, pageIndex: 0 }]);
    });
  });
});
