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
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { PaymentService } from '../payment.service';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatCheckbox } from '@angular/material/checkbox';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { UserService } from '../user.service';
import { AuthService } from '../auth.service';
import { MatMenuTrigger, MatMenu } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
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
    MatCardHeader,
    MatCardTitle,
    MatError,
    MatFormField,
    MatHint,
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
    MessageComponent,
    MatCard,
    MatCardContent,
    DecimalPipe,
    MatProgressSpinner,
    MatIcon,
    MatIconButton,
    MatCheckbox,
    SvgIconComponent,
    ReactiveFormsModule,
    MatMenuTrigger,
    MatMenu,
    MatProgressBarModule,
  ],
  templateUrl: './orders-list.component.html',
  styleUrl: './orders-list.component.scss',
})
export class OrdersListComponent implements OnInit, OnDestroy {
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

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  loadingOrders = true;

  submitted = false;

  form = new FormGroup({
    amount: new FormControl('', [Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]{1,2})?$/)]),
    terms: new FormControl(false, Validators.requiredTrue),
    agreement: new FormControl(false, Validators.requiredTrue),
  });

  constructor(
    protected creditService: CreditService,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private paymentService: PaymentService,
    protected userService: UserService,
    protected authService: AuthService,
  ) {
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
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadOrders();
    if (this.isLoggedIn()) {
      this.userService.loadUserDetails();
    }
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
    this.form.get('terms')?.markAsTouched();
    this.form.get('agreement')?.markAsTouched();
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
