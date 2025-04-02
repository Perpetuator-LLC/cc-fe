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
  pageSize = 10;
  currentPage = 0;
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

  loadOrders() {
    this.subscriptions.add(
      this.creditService.orders(this.currentPage + 1, this.pageSize, this.sortActive, this.sortDirection).subscribe({
        next: (data) => {
          // this.currentPage = data.currentPage;
          this.totalOrders = data.totalRecords;
          this.loadingOrders = false;
        },
        error: (error) => {
          this.messageService.error('Failed to load orders: ' + error.toString());
        },
      }),
    );
  }

  sortChange(sortState: Sort) {
    this.sortDirection = sortState.direction.toUpperCase();
    this.sortActive = sortState.active;
    this.loadOrders();
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.loadOrders();
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
