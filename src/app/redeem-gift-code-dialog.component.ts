// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from './user.service';
import { CodeService, Code } from './code.service';
import { CreditService } from './credit.service';
import { MessageService } from './message.service';
import { MatCardModule } from '@angular/material/card';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Subscription } from 'rxjs';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-redeem-gift-code-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatPaginatorModule,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatIcon,
  ],
  template: `
    <mat-card class="codes" [ngClass]="{ 'admin-view': permissions.includes('api.add_bonuscode') }">
      <mat-card-header>
        <div>
          <mat-card-title>Redeem Gift Code</mat-card-title>
          <p class="description">
            Have a gift code? Enter it below and enjoy your exclusive benefits - it's our way of saying thank you!
          </p>
        </div>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="fill">
          <mat-label>Redeem Code</mat-label>
          <input matInput [(ngModel)]="code" (ngModelChange)="codeError = false" placeholder="Enter code" />
        </mat-form-field>
        @if (codeError) {
          <div class="error-message">Please enter a code before redeeming.</div>
        }
        <div class="btn-container">
          <button mat-raised-button class="cancel-btn" color="primary" (click)="onCancel()">Cancel</button>
          <button mat-raised-button class="redeem-btn" color="primary" (click)="redeemCode()">
            @if (redeeming) {
              <mat-progress-spinner diameter="20" mode="indeterminate" />
            }
            @if (!redeeming) {
              <span>Redeem</span>
            }
          </button>
        </div>

        @if (permissions.includes('api.add_bonuscode')) {
          <div class="admin-section">
            <h3 class="admin-title">Admin: Bonus Code Management</h3>
            <form [formGroup]="createCodeForm" (ngSubmit)="createCode()">
              <div class="form-row">
                <mat-form-field appearance="fill">
                  <mat-label>Bonus Code</mat-label>
                  <input matInput formControlName="code" required />
                </mat-form-field>
                <mat-form-field appearance="fill">
                  <mat-label>Credit Amount</mat-label>
                  <input matInput formControlName="creditAmount" type="number" required />
                </mat-form-field>
              </div>
              <button mat-raised-button color="primary" type="submit">Create Bonus Code</button>
            </form>

            @if (loadingCodes) {
              <div class="loading-container">
                <mat-spinner />
              </div>
            }
            @if (!loadingCodes && codes.length > 0) {
              <div class="filter-controls">
                <mat-button-toggle-group [value]="activeCodesFilter">
                  <mat-button-toggle [value]="true" (click)="toggleActiveFilter(true)">
                    <mat-icon>check_circle</mat-icon> Unused Codes
                  </mat-button-toggle>
                  <mat-button-toggle [value]="false" (click)="toggleActiveFilter(false)">
                    <mat-icon>cancel</mat-icon> Used Codes
                  </mat-button-toggle>
                  <mat-button-toggle [value]="null" (click)="toggleActiveFilter(null)">
                    <mat-icon>all_inclusive</mat-icon> All Codes
                  </mat-button-toggle>
                </mat-button-toggle-group>
              </div>

              <div class="table-container">
                <table mat-table [dataSource]="dataSource" class="codes-table">
                  <ng-container matColumnDef="code">
                    <th mat-header-cell *matHeaderCellDef>Code</th>
                    <td mat-cell *matCellDef="let giftCode">{{ giftCode.code }}</td>
                  </ng-container>

                  <ng-container matColumnDef="creditAmount">
                    <th mat-header-cell *matHeaderCellDef>Credit Amount</th>
                    <td mat-cell *matCellDef="let giftCode">{{ giftCode.creditAmount }}</td>
                  </ng-container>

                  <ng-container matColumnDef="creator">
                    <th mat-header-cell *matHeaderCellDef>Creator</th>
                    <td mat-cell *matCellDef="let giftCode">{{ giftCode.creator.username }}</td>
                  </ng-container>

                  <ng-container matColumnDef="consumer">
                    <th mat-header-cell *matHeaderCellDef>Consumer</th>
                    <td mat-cell *matCellDef="let giftCode">{{ giftCode.consumer?.username || 'N/A' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="consumedAt">
                    <th mat-header-cell *matHeaderCellDef>Consumed At</th>
                    <td mat-cell *matCellDef="let giftCode">{{ giftCode.consumedAt | date: 'short' : 'local' }}</td>
                  </ng-container>

                  <tr
                    mat-header-row
                    *matHeaderRowDef="['code', 'creditAmount', 'creator', 'consumer', 'consumedAt']"
                  ></tr>
                  <tr
                    mat-row
                    *matRowDef="let row; columns: ['code', 'creditAmount', 'creator', 'consumer', 'consumedAt']"
                  ></tr>
                </table>
                <mat-paginator
                  [length]="totalCodes"
                  [pageIndex]="currentPage"
                  [pageSize]="pageSize"
                  [pageSizeOptions]="[5, 10, 20]"
                  [showFirstLastButtons]="false"
                  (page)="onCodesPageChange($event)"
                />
              </div>
            }
            @if (!loadingCodes && codes.length === 0) {
              <p class="no-codes">No codes found.</p>
            }
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      .btn-container {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .cancel-btn {
        background: var(--secondary-light);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        color: var(--theme-color);
        font-weight: 500;
      }

      .redeem-btn {
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--primary) !important;
        color: white !important;
        min-width: 225px;
      }

      /* Create Bonus Code form styling */
      form {
        margin: 20px 0;
        padding: 20px;
        border: 1px solid var(--border-color);
        border-radius: 10px;
        background: var(--secondary-light);
      }

      form button[type='submit'] {
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: var(--primary) !important;
        color: white !important;
        font-weight: 500;
        margin-top: 16px;
      }

      form button[type='submit']:hover {
        opacity: 0.9;
      }

      /* Filter controls styling */
      .filter-controls {
        margin: 20px 0;
        display: flex;
        justify-content: center;
      }

      .filter-controls mat-button-toggle-group {
        border: 1px solid var(--border-color);
        border-radius: 10px;
        overflow: hidden;
      }

      .filter-controls mat-button-toggle {
        border: none !important;
        border-right: 1px solid var(--border-color) !important;
        border-radius: 0 !important;
        background: var(--secondary-light);
        color: var(--theme-color);
        font-weight: 500;
      }

      .filter-controls mat-button-toggle:last-child {
        border-right: none !important;
      }

      .filter-controls mat-button-toggle.mat-button-toggle-checked {
        background: var(--primary) !important;
        color: white !important;
      }

      .filter-controls mat-button-toggle:hover:not(.mat-button-toggle-checked) {
        background: var(--secondary-400);
      }

      .filter-controls mat-button-toggle mat-icon {
        margin-right: 8px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .mat-mdc-card-title {
        color: var(--theme-color);
        font-size: 18px;
      }
      .description {
        font-size: 14px;
        font-weight: 400;
        color: var(--description-color);
        margin-bottom: 18px;
        margin-top: 12px;
      }
      .delete-dialog {
        padding: 28px;
      }
      .delete-dialog .mat-mdc-dialog-title {
        padding: 0;
        font-size: 18px;
      }
      .delete-dialog .mat-mdc-dialog-title::before {
        display: none;
      }
      .mat-mdc-dialog-content {
        padding: 0;
        color: var(--description-color);
      }
      .mat-mdc-dialog-content p {
        margin-top: 0;
      }
      .action-row {
        margin-top: 20px;
      }
      mat-dialog-actions {
        padding: 20px 0 0;
      }
      .cancel-btn {
        background: var(--secondary-light);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        color: var(--theme-color);
        font-weight: 500;
      }
      .delete-btn {
        border-radius: 10px;
        border: 1px solid var(--border-color);
        background: #ff4a4a !important;
        color: white !important;
      }

      /* Admin view specific styles */
      .admin-view {
        min-width: 600px;
        max-width: 90vw;
        width: 800px;
      }

      .admin-section {
        margin-top: 20px;
      }

      .admin-title {
        font-size: 16px;
        font-weight: 500;
        color: var(--theme-color);
        margin-bottom: 16px;
      }

      .form-row {
        display: flex;
        gap: 10px;
      }

      .loading-container {
        display: flex;
        justify-content: center;
        margin: 20px 0;
      }

      .table-container {
        overflow-x: auto;
      }

      .codes-table {
        min-width: 500px;
      }

      .no-codes {
        text-align: center;
        color: var(--description-color);
        font-size: 14px;
        margin: 20px 0;
      }
    `,
  ],
})
export class RedeemGiftCodeDialogComponent implements OnInit, OnDestroy {
  code = '';
  createCodeForm: FormGroup;
  codes: Code[] = [];
  dataSource = new MatTableDataSource<Code>(this.codes);
  loadingCodes = true;
  permissions: string[] = [];
  cursors: (string | null)[] = [null];
  totalCodes = 0;
  pageSize = 5;
  currentPage = 0;
  activeCodesFilter: boolean | null = true;
  private subscriptions = new Subscription();
  redeeming = false;
  codeError = false;

  @ViewChild(MatPaginator) codesPaginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<RedeemGiftCodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string; permissions: string[] },
    private userService: UserService,
    private codeService: CodeService,
    private creditService: CreditService,
    private messageService: MessageService,
  ) {
    this.permissions = data.permissions || [];
    this.createCodeForm = this.fb.group({
      code: ['', Validators.required],
      creditAmount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit() {
    this.loadCodes();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  redeemCode() {
    if (!this.code) {
      this.codeError = true;
      return;
    }
    this.codeError = false;
    this.redeeming = true;
    this.subscriptions.add(
      this.codeService.redeemCode(this.code).subscribe({
        next: () => {
          this.messageService.success('Code redeemed successfully.');
          this.code = '';
          this.loadCodes();
          this.creditService.refetchUserCredits();
          this.redeeming = false;
        },
        error: (err: unknown) => {
          const msg =
            err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
          this.messageService.error('Failed to redeem code: ' + msg);
          this.redeeming = false;
        },
      }),
    );
  }

  createCode() {
    if (this.createCodeForm.valid) {
      const { code, creditAmount } = this.createCodeForm.value;
      this.subscriptions.add(
        this.codeService.createCode(code, creditAmount).subscribe({
          next: () => {
            this.messageService.success('Code created successfully.');
            this.createCodeForm.reset();
            this.loadCodes();
          },
          error: (err: unknown) => {
            const msg =
              err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
            this.messageService.error('Failed to create code: ' + msg);
          },
        }),
      );
    }
  }

  private loadCodes(after: string | null = null, pageIndex = 0) {
    if (!this.permissions.includes('api.add_bonuscode')) {
      this.loadingCodes = false;
      return;
    }
    this.loadingCodes = true;
    this.currentPage = pageIndex;
    this.subscriptions.add(
      this.codeService.getCodes(this.activeCodesFilter, after, this.pageSize).subscribe({
        next: ({ codes, pageInfo }) => {
          this.codes = codes;
          this.dataSource.data = codes;
          this.cursors[pageIndex + 1] = pageInfo.endCursor ?? null;
          // Better total count calculation - use a large number if there are more pages
          this.totalCodes = pageInfo.hasNextPage ? (pageIndex + 2) * this.pageSize : (pageIndex + 1) * this.pageSize;
          this.loadingCodes = false;
        },
        error: (err) => {
          this.messageService.error('Failed to load codes: ' + err.message);
          this.loadingCodes = false;
        },
      }),
    );
  }

  onCodesPageChange(event: PageEvent) {
    const newPageIndex = event.pageIndex;
    const newPageSize = event.pageSize;

    // If pageSize changed, reset pagination entirely
    if (newPageSize !== this.pageSize) {
      this.pageSize = newPageSize;
      this.currentPage = 0;
      this.cursors = [null];
      this.loadCodes(null, 0);
      return;
    }

    // Normal page navigation
    const after = this.cursors[newPageIndex] ?? null;
    this.loadCodes(after, newPageIndex);
  }

  toggleActiveFilter(value: boolean | null) {
    this.activeCodesFilter = value;
    this.currentPage = 0;
    this.cursors = [null];
    this.loadCodes(null, 0);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
