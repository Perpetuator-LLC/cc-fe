// Copyright (c) 2025 Perpetuator LLC

import { AfterViewInit, Directive, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

/**
 * Base class for components using Relay cursor-based pagination with MatPaginator.
 * Handles the critical issue where MatTableDataSource's built-in pagination
 * conflicts with server-side cursor pagination.
 *
 * USAGE:
 * 1. Extend this class in your component
 * 2. Implement loadPage(pageSize, cursor, pageIndex) to fetch data
 * 3. Call handlePageData(items, pageInfo, pageIndex) in your load method
 * 4. In ngAfterViewInit, call super.ngAfterViewInit()
 */
@Directive()
export abstract class RelayPaginatorBase<T> implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<T>([]);
  cursors: (string | null)[] = [null];
  totalItems = 0;
  pageSize = 10;

  // eslint-disable-next-line @angular-eslint/no-empty-lifecycle-method
  ngAfterViewInit(): void {
    // DO NOT assign paginator to dataSource - breaks back button with cursor pagination
    // this.dataSource.paginator = this.paginator; // ❌ WRONG
    // This method exists for subclasses to call super.ngAfterViewInit()
  }

  /**
   * Call this in your loadPage implementation after receiving data
   */
  protected handlePageData(
    items: T[],
    pageInfo: { hasNextPage: boolean; endCursor: string | null },
    pageIndex: number,
  ): void {
    // Update data without recreating dataSource (preserves paginator state)
    this.dataSource.data = items;

    // Store cursor for NEXT page
    this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;

    // Set total to control buttons:
    // - Back enabled when pageIndex > 0
    // - Next enabled when (pageIndex + 1) * pageSize < total
    this.totalItems = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
  }

  /**
   * Page change handler - call from template (page)="onPageChange($event)"
   */
  onPageChange(event: PageEvent): void {
    const newPageIndex = event.pageIndex;
    const newPageSize = event.pageSize;

    // If pageSize changed, reset pagination
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.cursors = [null];
      this.paginator.firstPage();
      this.loadPage(this.pageSize, null, 0);
      return;
    }

    // Use stored cursor for target page
    const after = this.cursors[newPageIndex] ?? null;
    this.loadPage(this.pageSize, after, newPageIndex);
  }

  /**
   * Implement this to load data from your service
   * Call handlePageData(items, pageInfo, pageIndex) after receiving data
   */
  protected abstract loadPage(pageSize: number, cursor: string | null, pageIndex: number): void;
}
