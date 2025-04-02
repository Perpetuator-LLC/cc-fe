// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserTransaction, CreditService } from '../credit.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { ToolbarService } from '../toolbar.service';
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
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { jobTypeToString } from '../job.service';

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
    MatTooltip,
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
    MessageComponent,
    MatCard,
    MatCardContent,
    DecimalPipe,
  ],
  templateUrl: './transactions-list.component.html',
  styleUrl: './transactions-list.component.scss',
})
export class TransactionsListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  transactions: UserTransaction[] = [];
  dataSource = new MatTableDataSource<UserTransaction>(this.transactions);
  displayedColumns: string[] = ['createdAt', 'info', 'creditAmount', 'balance'];
  totalTransactions = 0;
  pageSize = 10;
  currentPage = 0;
  sortDirection = 'DESC';
  sortActive = 'createdAt';

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private creditService: CreditService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadTransactions();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadTransactions() {
    this.subscriptions.add(
      this.creditService
        .transactions(this.currentPage + 1, this.pageSize, this.sortActive, this.sortDirection)
        .subscribe({
          next: (data) => {
            this.transactions = data.transactions;
            this.dataSource.data = this.transactions;
            this.totalTransactions = data.totalRecords;
          },
          error: (error) => {
            this.messageService.error('Failed to load transactions: ' + error.toString());
          },
        }),
    );
  }

  sortChange(sortState: Sort) {
    this.sortDirection = sortState.direction.toUpperCase();
    this.sortActive = sortState.active;
    this.loadTransactions();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadTransactions();
  }

  getTransactionInfo(transaction: UserTransaction) {
    if (transaction.job?.jobType != null) {
      return jobTypeToString(transaction.job.jobType);
    }
    return transaction.description;
  }
}
