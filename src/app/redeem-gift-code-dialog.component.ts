// Copyright (c) 2025 Perpetuator LLC
import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { UserService } from './user.service';
import { CodeService, Code } from './code.service';
import { CreditService } from './credit.service';
import { MessageService } from './message.service';
import { MatCardModule } from '@angular/material/card';

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
  ],
  template: `
    <mat-card class="codes">
      <mat-card-header>
        <div>
          <mat-card-title>Redeem Gift Code</mat-card-title>
          <p class="description">
            Have a gift code? Enter it below and enjoy your exclusive benefits — it’s our way of saying thank you!
          </p>
        </div>
      </mat-card-header>
      <mat-card-content>
        <mat-form-field appearance="fill" style="width:100%">
          <mat-label>Redeem Code</mat-label>
          <input matInput [(ngModel)]="code" (ngModelChange)="codeError = false" placeholder="Enter code" />
        </mat-form-field>
        <div
          class="error-message"
          *ngIf="codeError"
          style="color: #ff4a4a;font-size: 13px;margin-top: 0;position: relative;top: -12px;"
        >
          Please enter a code before redeeming.
        </div>
        <div class="btn-container">
          <button mat-raised-button class="cancel-btn" color="primary" (click)="onCancel()">Cancel</button>
          <button mat-raised-button class="redeem-btn" color="primary" (click)="redeemCode()">
            <mat-progress-spinner diameter="20" *ngIf="redeeming" mode="indeterminate"></mat-progress-spinner
            ><span *ngIf="!redeeming">Redeem</span>
          </button>
        </div>

        <ng-container *ngIf="permissions?.includes('api.add_bonuscode')">
          <div>
            <form [formGroup]="createCodeForm" (ngSubmit)="createCode()">
              <mat-form-field appearance="fill">
                <mat-label>Bonus Code</mat-label>
                <input matInput formControlName="code" required />
              </mat-form-field>
              <mat-form-field appearance="fill">
                <mat-label>Credit Amount</mat-label>
                <input matInput formControlName="creditAmount" type="number" required />
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit">Create Bonus Code</button>
            </form>

            <ng-container *ngIf="loadingCodes">
              <mat-spinner></mat-spinner>
            </ng-container>
            <ng-container *ngIf="!loadingCodes && codes.length > 0">
              <table mat-table [dataSource]="codes">
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
            </ng-container>
            <ng-container *ngIf="!loadingCodes && codes.length === 0">
              <p>No codes found.</p>
            </ng-container>
          </div>
        </ng-container>
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
    `,
  ],
})
export class RedeemGiftCodeDialogComponent implements OnInit {
  code = '';
  createCodeForm: FormGroup;
  codes: Code[] = [];
  loadingCodes = true;
  permissions: string[] = [];

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

  redeeming = false;
  codeError = false;

  redeemCode() {
    if (!this.code) {
      this.codeError = true;
      return;
    }
    this.codeError = false;
    this.redeeming = true;
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
    });
  }

  createCode() {
    if (this.createCodeForm.valid) {
      const { code, creditAmount } = this.createCodeForm.value;
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
      });
    }
  }

  loadCodes() {
    if (!this.permissions.includes('api.add_bonuscode')) {
      this.loadingCodes = false;
      return;
    }
    this.loadingCodes = true;
    this.codeService.getCodes().subscribe({
      next: (data: { codes: Code[] }) => {
        this.codes = data.codes;
        this.loadingCodes = false;
      },
      error: (err: unknown) => {
        const msg =
          err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : String(err);
        this.messageService.error('Failed to load codes: ' + msg);
        this.loadingCodes = false;
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
