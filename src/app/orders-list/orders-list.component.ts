// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { UserOrder, CreditService } from '../credit.service';
import { DatePipe, DecimalPipe } from '@angular/common';
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
  MatTableModule,
} from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
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
    MatProgressSpinner,
    MatIcon,
    MatIconButton,
  ],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss',
})
export class OrdersListComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  orders: UserOrder[] = [];
  totalOrders = 0;
  cursors: (string | null)[] = [null];
  pageSize = 10;
  sortDirection = 'DESC';
  sortActive = 'createdAt';

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  loadingOrders = true;

  constructor(
    protected creditService: CreditService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadOrders();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadOrders(after: string | null = null, pageIndex = 0) {
    this.loadingOrders = true;
    this.subscriptions.add(
      this.creditService.getOrders(this.pageSize, after, this.sortActive, this.sortDirection).subscribe({
        next: ({ orders, pageInfo }) => {
          this.orders = orders;
          this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
          this.totalOrders = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
          this.loadingOrders = false;
        },
        error: (error) => {
          this.messageService.error('Failed to load orders: ' + error.toString());
          this.loadingOrders = false;
        },
      }),
    );
  }

  sortChange(sortState: Sort) {
    this.sortActive = sortState.active;
    this.sortDirection = sortState.direction.toUpperCase();
    this.cursors = [null]; // reset all known cursors
    this.paginator.firstPage();
    this.loadOrders();
  }

  onPageChange(event: PageEvent) {
    const newPageIndex = event.pageIndex;
    const newPageSize = event.pageSize;

    // If pageSize changed, reset pagination entirely
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.cursors = [null]; // reset all known cursors
      this.paginator.firstPage(); // back to pageIndex = 0
      this.loadOrders(); // load first page
      return;
    }

    // Otherwise, grab the cursor for the page they jumped to
    const after = this.cursors[newPageIndex] ?? null;
    this.loadOrders(after, newPageIndex);
  }

  refreshOrder(id: string) {
    this.creditService.refreshUserOrder(id).subscribe({
      next: (data) => {
        this.messageService.success(`Order refreshed successfully: ${data.message}`);
      },
      error: (err) => {
        this.messageService.error('Failed to refresh order: ' + err.message);
      },
    });
  }

  cancelOrder(id: string) {
    this.creditService.cancelUserOrder(id).subscribe({
      next: () => this.messageService.success('Order cancelled successfully'),
      error: (err) => this.messageService.error('Failed to cancel order: ' + err.message),
    });
  }
}
