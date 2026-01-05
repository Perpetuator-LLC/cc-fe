// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
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
  MatTableDataSource,
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
    MatPaginator,
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
  private subscriptions: Subscription = new Subscription();
  transactions: UserTransaction[] = [];
  dataSource = new MatTableDataSource<UserTransaction>(this.transactions);
  displayedColumns: string[] = ['createdAt', 'type', 'info', 'creditAmount', 'balance'];
  totalTransactions = 0;
  pageSize = 10;
  cursors: (string | null)[] = [null];
  hasNextPage = false;
  hasPreviousPage = false;
  sortDirection = 'DESC';
  sortActive = 'createdAt';
  loading = false;
  selectedTypeFilter: string | null = null;

  /** Available transaction type filters */
  typeFilters = [
    { value: null, label: 'All Types' },
    { value: 'PURCHASE', label: 'Purchases' },
    { value: 'JOB', label: 'AI Usage' },
    { value: 'COMMAND', label: 'Commands' },
    { value: 'BONUS', label: 'Bonuses' },
    { value: 'ADJUSTMENT', label: 'Adjustments' },
    { value: 'REFUND', label: 'Refunds' },
  ];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private creditService: CreditService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private loadingService: LoadingService,
  ) {}

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadTransactions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  loadTransactions(after: string | null = null, pageIndex = 0) {
    this.loading = true;
    this.loadingService.show();
    this.subscriptions.add(
      this.creditService
        .getTransactions(this.pageSize, after, this.sortActive, this.sortDirection, this.selectedTypeFilter)
        .subscribe({
          next: (response) => {
            this.transactions = response.transactions;
            this.dataSource.data = this.transactions;
            this.hasNextPage = response.pageInfo.hasNextPage;
            this.hasPreviousPage = response.pageInfo.hasPreviousPage;
            this.cursors[pageIndex + 1] = response.pageInfo.endCursor ?? null;

            // Set a large enough number to enable the next button if hasNextPage is true
            this.totalTransactions = response.pageInfo.hasNextPage
              ? (pageIndex + 2) * this.pageSize
              : (pageIndex + 1) * this.pageSize;
          },
          error: (error) => {
            console.error(error);
            this.messageService.error('Failed to load transactions: ' + error.toString());
            this.loading = false;
            this.loadingService.hide();
          },
          complete: () => {
            this.loading = false;
            this.loadingService.hide();
          },
        }),
    );
  }

  sortChange(sortState: Sort) {
    this.sortDirection = sortState.direction.toUpperCase();
    this.sortActive = sortState.active;
    this.cursors = [null];
    this.paginator?.firstPage();
    this.loadTransactions();
  }

  onPageChange(event: PageEvent) {
    const newPageIndex = event.pageIndex;
    const newPageSize = event.pageSize;

    // If pageSize changed, reset pagination entirely
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.cursors = [null]; // reset all known cursors
      this.paginator.firstPage(); // back to pageIndex = 0
      this.loadTransactions(); // load first page
      return;
    }

    // Otherwise, grab the cursor for the page they jumped to
    const after = this.cursors[newPageIndex] ?? null;
    this.loadTransactions(after, newPageIndex);
  }

  onTypeFilterChange(type: string | null) {
    this.selectedTypeFilter = type;
    this.cursors = [null];
    this.paginator?.firstPage();
    this.loadTransactions();
  }

  getTransactionInfo(transaction: UserTransaction) {
    // For command transactions, show the parsed command
    if (transaction.transactionType === 'COMMAND' && transaction.commandExecution?.parsedCommand) {
      return transaction.commandExecution.parsedCommand;
    }
    // For job transactions, show the job kind
    if (transaction.job?.kind != null) {
      return kindToString(transaction.job.kind);
    }
    return transaction.description;
  }

  /** Get icon for transaction type */
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

  /** Get tooltip for charges breakdown */
  getChargesBreakdownTooltip(transaction: UserTransaction): string {
    if (!transaction.chargesBreakdown?.length) {
      return '';
    }
    return transaction.chargesBreakdown.map((c) => `${c.service}: ${c.units.toLocaleString()} units`).join('\n');
  }
}
