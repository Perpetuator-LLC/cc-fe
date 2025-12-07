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
import { UserService } from '../../user/user.service';
import { CodeService, Code } from '../code.service';
import { CreditService } from '../credit.service';
import { MessageService } from '../../message.service';
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
  templateUrl: './redeem-gift-code-dialog.component.html',
  styleUrl: './redeem-gift-code-dialog.component.scss',
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
