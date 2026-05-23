// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { UserOrder, CreditService } from '../credit.service';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ToolbarService } from '../../layout/toolbar.service';
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
import { MatCardContent } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatButton, MatIconButton } from '@angular/material/button';
import { PaymentService } from '../payment.service';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserService } from '../../user/user.service';
import { AuthService } from '../../auth/auth.service';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../layout/loading.service';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-orders-list',
  standalone: true,
  imports: [
    CommonModule,
    MatPaginatorModule,
    MatTableModule,
    MatSortModule,
    DatePipe,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCell,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    MatCell,
    MatCellDef,
    MatHeaderCellDef,
    MatHeaderRowDef,
    MatRow,
    MatHeaderRow,
    MatRowDef,
    MatPaginator,

    MatCardContent,
    DecimalPipe,
    MatIcon,
    MatIconButton,
    ReactiveFormsModule,
    MatMenuTrigger,
    MatMenu,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButton,
  ],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss',
})
export class OrdersListComponent implements OnInit, OnDestroy {
  protected creditService = inject(CreditService);
  private toolbarService = inject(ToolbarService);
  private messageService = inject(MessageService);
  private paymentService = inject(PaymentService);
  protected userService = inject(UserService);
  protected authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private subscriptions: Subscription = new Subscription();
  orders: UserOrder[] = [];
  protected userCredits = 0;
  totalOrders = 0;
  cursors: (string | null)[] = [null];
  pageSize = 10;
  sortDirection = 'DESC';
  sortActive = 'createdAt';
  protected user = this.userService.userDetails;
  protected isLoggedIn = this.authService.isLoggedIn;

  // Status filter - default to PAID and PENDING, hide CANCELED
  statusFilter = new FormControl<string[]>(['PAID', 'PENDING']);
  availableStatuses = ['PAID', 'PENDING', 'CANCELED'];
  /** Pre-built status chips for the filter — `value` + lowercase class + selected flag. */
  statusChips: { value: string; lowerCase: string; selected: boolean }[] = [
    { value: 'PAID', lowerCase: 'paid', selected: false },
    { value: 'PENDING', lowerCase: 'pending', selected: false },
    { value: 'CANCELED', lowerCase: 'canceled', selected: false },
  ];

  private refreshStatusChips(): void {
    const selected = (this.statusFilter.value || []) as string[];
    this.statusChips = this.availableStatuses.map((value) => ({
      value,
      lowerCase: value.toLowerCase(),
      selected: selected.includes(value),
    }));
  }

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  loadingOrders = true;

  submitted = false;

  form = new FormGroup({
    amount: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/)]),
  });

  constructor() {
    toObservable(this.creditService.userCredits).subscribe({
      next: (credits) => {
        this.userCredits = credits;
      },
      error: (error) => {
        this.messageService.error(`Failed to load credits signal: ${error.message}`);
      },
    });
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadOrders();
    if (this.isLoggedIn()) {
      this.userService.loadUserDetails();
    }

    // Handle payment query params from Stripe redirect
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        if (params['payment'] === 'success') {
          this.messageService.success('Payment was successful.', 15000, true);
          this.router.navigate([], { queryParams: { payment: null }, queryParamsHandling: 'merge', replaceUrl: true });
        } else if (params['payment'] === 'cancel') {
          this.messageService.warning('Payment incomplete.', 15000, true);
          this.router.navigate([], { queryParams: { payment: null }, queryParamsHandling: 'merge', replaceUrl: true });
        }
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
  }

  loadOrders(after: string | null = null, pageIndex = 0) {
    this.loadingOrders = true;
    this.loadingService.show();
    this.subscriptions.add(
      this.creditService.getOrders(this.pageSize, after, this.sortActive, this.sortDirection).subscribe({
        next: ({ orders, pageInfo }) => {
          this.orders = orders;
          this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
          this.totalOrders = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
          this.loadingOrders = false;
          this.loadingService.hide();
        },
        error: (error) => {
          this.messageService.error('Failed to load orders: ' + error.toString());
          this.loadingOrders = false;
          this.loadingService.hide();
        },
        complete: () => {
          this.loadingOrders = false;
          this.loadingService.hide();
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

  get filteredOrders(): UserOrder[] {
    const selectedStatuses = this.statusFilter.value || [];
    return this.creditService.userOrders().filter((order) => selectedStatuses.includes(order.status));
  }

  toggleStatusFilter(status: string): void {
    const currentFilters = this.statusFilter.value || [];
    const index = currentFilters.indexOf(status);

    if (index >= 0) {
      // Remove from filter
      const newFilters = currentFilters.filter((s) => s !== status);
      this.statusFilter.setValue(newFilters);
    } else {
      // Add to filter
      this.statusFilter.setValue([...currentFilters, status]);
    }
    this.refreshStatusChips();
  }

  isStatusSelected(status: string): boolean {
    return (this.statusFilter.value || []).includes(status);
  }

  get calculatedCredits(): number {
    const amount = Number(this.form.get('amount')?.value);
    if (!isNaN(amount) && amount > 0) {
      return amount * 1000;
    }
    return 0;
  }

  setAmount(dollars: number) {
    this.form.get('amount')?.setValue(String(dollars));
    // Optionally trigger validation or recalculation here
  }

  payFromInput() {
    this.submitted = true;
    this.form.get('amount')?.markAsTouched();
    if (this.form.invalid) {
      return;
    }
    const amount = this.form.get('amount')?.value;
    if (amount != null && amount !== '' && !isNaN(+amount)) {
      this.pay(+amount * 100);
    }
  }

  pay(amount: number) {
    this.subscriptions.add(
      this.paymentService.createCheckoutSession(amount).subscribe({
        next: (data) => {
          if (data?.order?.sessionUrl) {
            this.paymentService.redirectToCheckout(data.order.sessionUrl);
          }
        },
        error: (err) => {
          this.messageService.error('Failed to create checkout session: ' + err.message);
        },
      }),
    );
  }
}
