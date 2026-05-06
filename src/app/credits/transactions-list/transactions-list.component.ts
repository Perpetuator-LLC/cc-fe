// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserTransaction, CreditService } from '../credit.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ToolbarService } from '../../layout/toolbar.service';
import { MatIcon } from '@angular/material/icon';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable,
  MatTableModule,
} from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MessageService } from '../../message.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { kindToString } from '../../jobs/job.service';
import { LoadingService } from '../../layout/loading.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
    MatIcon,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCell,
    MatCell,
    MatCellDef,
    MatHeaderCellDef,
    MatHeaderRowDef,
    MatRow,
    MatHeaderRow,
    MatRowDef,
    MatCard,
    MatCardContent,
    MatProgressSpinnerModule,
    DecimalPipe,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './transactions-list.component.html',
  styleUrl: './transactions-list.component.scss',
})
export class TransactionsListComponent implements OnInit, OnDestroy {
  private creditService = inject(CreditService);
  private toolbarService = inject(ToolbarService);
  private messageService = inject(MessageService);
  private loadingService = inject(LoadingService);

  private subscriptions: Subscription = new Subscription();

  // Table data
  transactions: UserTransaction[] = [];
  displayedColumns: string[] = ['createdAt', 'type', 'info', 'creditAmount', 'balance'];

  // Sorting
  sortDirection = 'DESC';
  sortActive = 'createdAt';

  // Pagination - simple cursor-based with total count
  pageSize = 10;
  pageIndex = 0;
  totalCount = 0;
  cursors: (string | null)[] = [null]; // Store cursor for each page

  // UI state
  loading = false;
  selectedTypeFilter: string | null = null;
  typeFilters: { value: string | null; label: string }[] = [{ value: null, label: 'All Types' }];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadTransactionTypes();
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  /** Load available transaction types from backend */
  private loadTransactionTypes(): void {
    this.subscriptions.add(
      this.creditService.getTransactionTypes().subscribe({
        next: (types) => {
          console.log('[Transactions] Loaded types:', types);
          this.typeFilters = [{ value: null, label: 'All Types' }, ...types];
        },
        error: (error: Error) => {
          console.error('[Transactions] Failed to load types:', error);
        },
      }),
    );
  }

  /** Load total count for current filter */
  private loadTotalCount(): void {
    this.subscriptions.add(
      this.creditService.getTransactionsCount(this.selectedTypeFilter).subscribe({
        next: (count: number) => {
          console.log('[Transactions] Total count:', count);
          this.totalCount = count;
        },
        error: (error: Error) => {
          console.error('[Transactions] Failed to load count:', error);
        },
      }),
    );
  }

  /** Load transactions for current page */
  private loadTransactions(): void {
    this.loading = true;
    this.loadingService.show();

    // Load count on first page
    if (this.pageIndex === 0) {
      this.loadTotalCount();
    }

    const cursor = this.cursors[this.pageIndex] ?? null;
    console.log('[Transactions] Loading page', this.pageIndex, 'with cursor:', cursor);

    this.subscriptions.add(
      this.creditService
        .getTransactions(this.pageSize, cursor, this.sortActive, this.sortDirection, this.selectedTypeFilter)
        .subscribe({
          next: (response) => {
            console.log('[Transactions] Received', response.transactions.length, 'items');
            console.log('[Transactions] pageInfo:', response.pageInfo);

            this.transactions = response.transactions;

            // Store cursor for next page
            if (response.pageInfo.endCursor) {
              this.cursors[this.pageIndex + 1] = response.pageInfo.endCursor;
            }

            this.loading = false;
            this.loadingService.hide();
          },
          error: (error: Error) => {
            console.error('[Transactions] Load error:', error);
            this.messageService.error('Failed to load transactions: ' + error.message);
            this.loading = false;
            this.loadingService.hide();
          },
        }),
    );
  }

  /** Handle page change from paginator */
  onPageChange(event: PageEvent): void {
    console.log('[Transactions] Page change:', event);

    // Handle page size change - reset to first page
    if (event.pageSize !== this.pageSize) {
      this.pageSize = event.pageSize;
      this.pageIndex = 0;
      this.cursors = [null];
      this.loadTransactions();
      return;
    }

    // Normal forward/backward navigation
    this.pageIndex = event.pageIndex;
    this.loadTransactions();
  }

  /** Handle sort change */
  sortChange(sortState: Sort): void {
    console.log('[Transactions] Sort change:', sortState);
    this.sortDirection = sortState.direction.toUpperCase() || 'DESC';
    this.sortActive = sortState.active;
    this.resetPagination();
    this.loadTransactions();
  }

  /** Handle filter change */
  onTypeFilterChange(type: string | null): void {
    console.log('[Transactions] Filter change:', type);
    this.selectedTypeFilter = type;
    this.resetPagination();
    this.loadTransactions();
  }

  /** Reset pagination state */
  private resetPagination(): void {
    this.pageIndex = 0;
    this.cursors = [null];
    this.totalCount = 0;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  getTransactionInfo(transaction: UserTransaction): string {
    if (transaction.transactionType === 'COMMAND' && transaction.commandExecution?.parsedCommand) {
      return transaction.commandExecution.parsedCommand;
    }
    if (transaction.job?.kind != null) {
      return kindToString(transaction.job.kind);
    }
    return transaction.description;
  }

  getTransactionIcon(transaction: UserTransaction): string {
    switch (transaction.transactionType) {
      case 'PURCHASE':
        return 'credit_card';
      case 'BONUS':
        return 'card_giftcard';
      case 'COMMAND':
        return 'terminal';
      case 'JOB':
        return 'smart_toy';
      case 'REFUND':
        return 'replay';
      case 'ADJUSTMENT':
        return 'tune';
      case 'DEDUCTION':
      default:
        return 'remove_circle';
    }
  }

  getChargesBreakdownTooltip(transaction: UserTransaction): string {
    if (!transaction.chargesBreakdown?.length) {
      return '';
    }
    return transaction.chargesBreakdown.map((c) => `${c.service}: ${c.units.toLocaleString()} units`).join('\n');
  }
}
