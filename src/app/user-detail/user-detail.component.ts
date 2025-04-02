// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetails, UserService } from '../user.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelDescription,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { TeamsService } from '../teams.service';
import { PaymentService } from '../payment.service';
import { CreditService } from '../credit.service';
import { CodeService, Code } from '../code.service';
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
} from '@angular/material/table';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    MatCard,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,
    MessageComponent,
    MatError,
    MatHint,
    MatAccordion,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    FormsModule,
    MatTable,
    MatHeaderCell,
    MatCell,
    MatColumnDef,
    DatePipe,
    DecimalPipe,
    MatHeaderRow,
    MatRow,
    RouterLink,
    MatHeaderCellDef,
    MatCellDef,
    MatHeaderRowDef,
    MatRowDef,
    MatIcon,
    MatIconButton,
    MatProgressSpinner,
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})
export class UserDetailComponent implements OnInit, OnDestroy {
  emailChangePending: { newEmail: string } | null = null;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  userDetailForm: FormGroup;
  changePasswordForm: FormGroup;
  deleteConfirmation = '';
  exportConfirmation = '';
  private subscriptions = new Subscription();
  private downloadAnchor: HTMLAnchorElement | null = null;
  // protected orders: UserOrders[] = [];
  protected loadingOrders = true;
  protected code = '';
  protected createCodeForm: FormGroup;
  protected codes: Code[] = [];
  protected loadingCodes = true;

  constructor(
    private fb: FormBuilder,
    protected userService: UserService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private teamService: TeamsService,
    private paymentService: PaymentService,
    protected creditService: CreditService,
    private codeService: CodeService,
  ) {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '' }],
    });

    this.changePasswordForm = this.fb.group(
      {
        username: ['', Validators.required],
        email: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator },
    );

    toObservable(this.userService.userDetails).subscribe((userData) => {
      this.userDetailForm.patchValue({
        username: userData?.username || '',
        email: userData?.email || '',
      });
      this.changePasswordForm.patchValue({
        username: userData?.username || '',
        email: userData?.email || '',
      });
    });

    this.changePasswordForm.get('confirmPassword')?.valueChanges.subscribe(() => {
      this.changePasswordForm.updateValueAndValidity();
    });

    this.createCodeForm = this.fb.group({
      code: ['', Validators.required],
      creditAmount: [0, [Validators.required, Validators.min(1)]],
    });
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadUserDetails();
    this.loadUserOrders();
    this.loadCodes();

    this.route.queryParams.subscribe((params) => {
      if (params['payment'] === 'success') {
        this.messageService.success('Payment was successful.', 15000, true);
        this.router.navigate([], { queryParams: { payment: null }, queryParamsHandling: 'merge', replaceUrl: true });
      } else if (params['payment'] === 'cancel') {
        this.messageService.warning('Payment incomplete.', 15000, true);
        this.router.navigate([], { queryParams: { payment: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.toolbarService.clearToolbarComponent();
  }

  private loadUserDetails() {
    this.userService.loadUserDetails();
    this.userService.loadUserEmailChangePending().subscribe({
      next: (emailChangePendingDetails) => {
        this.emailChangePending = emailChangePendingDetails;
      },
      error: (err) => {
        console.error('Failed to load email change pending:', err);
      },
    });
    this.emailChangePending = this.userService.emailChangePendingDetails;
  }

  private loadUserOrders() {
    this.subscriptions.add(
      this.creditService.orders(1, 5).subscribe({
        next: () => (this.loadingOrders = false),
        error: (err) => console.error('Failed to load orders:', err),
      }),
    );
  }

  redeemCode() {
    if (this.code) {
      this.codeService.redeemCode(this.code).subscribe({
        next: () => {
          this.messageService.success('code redeemed successfully.');
          this.code = '';
          this.loadCodes();
          this.creditService.refetchUserCredits();
        },
        error: (err) => {
          this.messageService.error('Failed to redeem code: ' + err.message);
        },
      });
    }
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
        error: (err) => {
          this.messageService.error('Failed to create code: ' + err.message);
        },
      });
    }
  }

  private loadCodes() {
    // Get the current value of the signal directly
    const userDetails = this.userService.userDetails();

    if (!userDetails) {
      this.loadingCodes = false;
      return;
    }

    const permissions = userDetails.permissions;
    const includesAddBonusPerm = permissions && permissions.length > 0 && permissions.includes('api.add_bonuscode');

    if (!includesAddBonusPerm) {
      this.loadingCodes = false;
      return;
    }

    this.loadingCodes = true;
    this.codeService.codes().subscribe({
      next: (data) => {
        this.codes = data.codes;
        this.loadingCodes = false;
      },
      error: (err) => {
        this.messageService.error('Failed to load codes: ' + err.message);
        this.loadingCodes = false;
      },
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const newPassword = formGroup.get('newPassword');
    const confirmPassword = formGroup.get('confirmPassword');

    let validationError = null;
    if (newPassword && confirmPassword) {
      const mismatch = newPassword.value !== confirmPassword.value;
      validationError = mismatch ? { mismatch: true } : null;
      confirmPassword.setErrors(validationError);
    }
    return validationError;
  }

  cancelEmailChange(): void {
    this.userService.cancelEmailChange().subscribe({
      next: () => {
        this.loadUserDetails();
        this.messageService.success('Email change cancelled.');
      },
      error: (err) => {
        console.error('Failed to cancel email change:', err);
        this.messageService.error('Failed to cancel email change request. Please try again.');
      },
    });
  }

  resendEmailChange(): void {
    this.userService.resendEmailChange().subscribe({
      next: () => {
        this.messageService.success('Email change request resent');
      },
      error: (err) => {
        console.error('Failed to reset email change:', err);
        this.messageService.error('Failed to reset email change request. Please try again.');
      },
    });
  }

  onSubmitUserDetails(): void {
    if (this.userDetailForm.valid) {
      const { username, email } = this.userDetailForm.value;
      this.userService.updateUser(username, email).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.success('User details updated successfully.');
            this.userService.loadUserDetails().subscribe({
              next: (userDetails: UserDetails) => {
                this.userDetailForm.patchValue({
                  username: userDetails.username,
                  email: userDetails.email,
                });
                this.changePasswordForm.patchValue({
                  username: userDetails.username,
                  email: userDetails.email,
                });
              },
            });
            this.userService.loadUserEmailChangePending().subscribe({
              next: (emailChangePendingDetails) => {
                this.emailChangePending = emailChangePendingDetails;
              },
              error: (err) => {
                console.error('Failed to load email change pending:', err);
              },
            });
          } else {
            this.messageService.error(`Failed to update user details: ${response.message}`);
          }
        },
        error: (err) => {
          console.error('Failed to update user details:', err);
          this.messageService.error(`Failed to update user details: ${err.message}`);
        },
      });
    } else {
      this.messageService.error('Please enter valid user details.');
    }
  }

  onSubmitPasswordChange(): void {
    if (this.changePasswordForm.valid) {
      const newPassword = this.changePasswordForm.get('newPassword')?.value;
      const confirmPassword = this.changePasswordForm.get('confirmPassword')?.value;

      if (newPassword !== confirmPassword) {
        this.messageService.error('Passwords do not match.');
        return;
      }

      this.userService.changePassword(newPassword).subscribe({
        next: () => {
          this.messageService.success('Password changed successfully.');
          window.location.reload();
        },
        error: (err) => {
          console.error('Failed to change password:', err);
          this.messageService.error('Failed to change password. Please try again.');
        },
      });
    } else {
      this.messageService.error('Please enter valid password details.');
    }
  }

  exportDialog() {
    if (this.downloadAnchor !== null) {
      this.downloadAnchor.click();
      return;
    }
    this.subscriptions.add(
      this.teamService.getUserDataExport(this.exportConfirmation).subscribe({
        next: (data) => {
          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          const url = window.URL.createObjectURL(blob);
          this.downloadAnchor = document.createElement('a');
          this.downloadAnchor.setAttribute('href', url);
          this.downloadAnchor.href = url;
          this.downloadAnchor.download = 'capital_copilot_account_data.json';
          document.body.appendChild(this.downloadAnchor);
          this.downloadAnchor.click();
          // clean up the URL object? - instead keep data for subsequent downloads
          // window.URL.revokeObjectURL(url);
          // this.downloadAnchor.remove();
        },
        error: (err) => {
          this.messageService.error('Failed to export user data: ' + err.message);
        },
      }),
    );
  }

  deleteDialog() {
    this.subscriptions.add(
      this.teamService.deleteUserResults().subscribe({
        next: (data) => {
          const deleteTeamNames = data.deletingTeams.map((team) => team.name);
          const leavingTeamNames = data.leavingTeams.map((team) => team.name);
          this.openDeleteConfirmationDialog(deleteTeamNames, leavingTeamNames);
        },
        error: (err) => {
          this.messageService.error('Failed to load teams: ' + err.message);
        },
      }),
    );
  }

  openDeleteConfirmationDialog(deletingTeams: (string | null)[], leavingTeams: (string | null)[]) {
    const email = this.userDetailForm.get('email')?.value;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        message:
          "<h3>Removing your account '" +
          email +
          "' will result in the following actions:<br/><br/>" +
          (deletingTeams?.length === 0
            ? 'You are not the sole owner of any teams, so no teams will be deleted.'
            : "You are the sole owner of the following team(s) and they will be permanently deleted: '" +
              deletingTeams.join("', '") +
              "'<br /><br/>WARNING: The deleted team's episodes and audio files will also be permanently deleted.") +
          '<br/><br/>' +
          (leavingTeams?.length === 0
            ? 'You will not be removed from any teams.'
            : "You will be removed from team(s): '" + leavingTeams.join("', '") + "'") +
          '<br/><br/>' +
          ' None of these actions can be undone.</h3>' +
          '<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe({
      next: (confirmed) => {
        if (confirmed) {
          // get confirmation from user
          this.deleteTeam();
        }
      },
      error: (err) => {
        this.messageService.error('Failed to delete account: ' + err.message);
      },
    });
  }

  private deleteTeam() {
    this.subscriptions.add(
      this.userService.deleteUser(this.deleteConfirmation).subscribe({
        next: () => {
          this.messageService.success('Account deleted successfully');
          this.authService.logout();
          this.userService.clearUserDetails();
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.messageService.error(`Failed to delete account: ${err.message}`);
        },
      }),
    );
  }

  pay(amount: number) {
    this.subscriptions.add(
      this.paymentService.createCheckoutSession(amount).subscribe({
        next: (data) => {
          if (data?.url) {
            this.paymentService.redirectToCheckout(data.url);
          }
        },
        error: (err) => {
          this.messageService.error('Failed to create checkout session: ' + err.message);
        },
      }),
    );
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
