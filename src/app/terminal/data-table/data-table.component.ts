// Copyright (c) 2025 Perpetuator LLC
import { Component, Input, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { TableData } from '../terminal.types';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatPaginatorModule, MatIconModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent implements OnChanges {
  @Input() data?: TableData | object;
  @Input() pageSize = 10;
  @Input() pageSizeOptions = [5, 10, 25, 50];

  displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<Record<string, unknown>>([]);
  title = '';
  totalRows = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.processData();
    }
  }

  private processData(): void {
    if (!this.data) return;

    // Check if data is TableData format
    if (this.isTableData(this.data)) {
      this.title = this.data.title || '';
      this.displayedColumns = this.data.headers;
      this.totalRows = this.data.rowCount;

      // Convert rows array to objects for MatTableDataSource
      const tableData = this.data as TableData;
      const rowData = tableData.rows.map((row) => {
        const obj: Record<string, unknown> = {};
        tableData.headers.forEach((header, index) => {
          obj[header] = row[index];
        });
        return obj;
      });

      this.dataSource.data = rowData;
    } else if (Array.isArray(this.data)) {
      // Handle array of objects
      if (this.data.length > 0) {
        this.displayedColumns = Object.keys(this.data[0] as object);
        this.dataSource.data = this.data as Record<string, unknown>[];
        this.totalRows = this.data.length;
      }
    } else if (typeof this.data === 'object') {
      // Handle single object - display as key-value pairs
      this.displayedColumns = ['key', 'value'];
      this.dataSource.data = Object.entries(this.data).map(([key, value]) => ({
        key,
        value: this.formatValue(value),
      }));
      this.totalRows = this.dataSource.data.length;
    }
  }

  private isTableData(data: unknown): data is TableData {
    return (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      (data as TableData).type === 'table' &&
      'headers' in data &&
      'rows' in data
    );
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  onSortChange(sort: Sort): void {
    if (!sort.active || sort.direction === '') {
      return;
    }

    const data = this.dataSource.data.slice();
    this.dataSource.data = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      const aVal = a[sort.active];
      const bVal = b[sort.active];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * (isAsc ? 1 : -1);
      }

      return String(aVal ?? '').localeCompare(String(bVal ?? '')) * (isAsc ? 1 : -1);
    });
  }

  onPageChange(event: PageEvent): void {
    // For client-side pagination, MatPaginator handles this automatically
    console.debug('Page changed:', event);
  }

  getCellValue(row: Record<string, unknown>, column: string): string {
    const value = row[column];
    return this.formatValue(value);
  }
}
