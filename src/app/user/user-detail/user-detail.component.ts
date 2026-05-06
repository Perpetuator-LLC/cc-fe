// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetails, UserService, UserPreferences } from '../user.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MessageService } from '../../message.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { ConfirmationDialogComponent } from '../../confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { TeamsService } from '../../team/teams.service';
import { CreditService } from '../../credits/credit.service';
import { CodeService } from '../../credits/code.service';
import { Subscription } from 'rxjs';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';
import { ExportPersonalDialogComponent } from '../export-personal-dialog/export-personal-dialog.component';
import { LoadingService } from '../../layout/loading.service';
import { AffiliateService, AffiliateRelationship } from '../../affiliate/affiliate.service';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [
    CommonModule,
    MatCard,
    ReactiveFormsModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,
    MatCheckbox,

    MatError,
    MatHint,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    FormsModule,
    MatIcon,
    RouterLink,
    MatTooltip,
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})
export class UserDetailComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  protected userService = inject(UserService);
  private messageService = inject(MessageService);
  private toolbarService = inject(ToolbarService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private teamService = inject(TeamsService);
  protected creditService = inject(CreditService);
  private codeService = inject(CodeService);
  private loadingService = inject(LoadingService);
  private affiliateService = inject(AffiliateService);

  emailChangePending: { newEmail: string } | null = null;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  userDetailForm: FormGroup;
  changePasswordForm: FormGroup;
  notificationPreferencesForm: FormGroup;
  phoneVerificationForm: FormGroup;
  deleteConfirmation = '';
  exportConfirmation = '';
  private subscriptions = new Subscription();
  private downloadAnchor: HTMLAnchorElement | null = null;
  // protected orders: UserOrders[] = [];
  protected loadingOrders = true;
  loading = false;
  affiliateRelationship: AffiliateRelationship | null = null;

  // Phone verification state
  phoneNumber: string | null = null;
  phoneVerified = false;
  showVerificationInput = false;
  savingPhone = false;
  sendingCode = false;
  verifyingPhone = false;

  constructor() {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '' }],
    });

    this.phoneVerificationForm = this.fb.group({
      phoneNumber: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      verificationCode: ['', [Validators.minLength(6), Validators.maxLength(6)]],
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

    this.notificationPreferencesForm = this.fb.group({
      lowBalanceAlerts: [false],
      lowBalanceSms: [false],
      newsletter: [false],
      marketingEmails: [false],
    });

    this.subscriptions.add(
      toObservable(this.userService.userDetails).subscribe((userData) => {
        this.userDetailForm.patchValue({
          username: userData?.username || '',
          email: userData?.email || '',
        });
        this.changePasswordForm.patchValue({
          username: userData?.username || '',
          email: userData?.email || '',
        });
      }),
    );

    this.subscriptions.add(
      this.changePasswordForm.get('confirmPassword')?.valueChanges.subscribe(() => {
        this.changePasswordForm.updateValueAndValidity();
      }),
    );
  }

  ngOnInit(): void {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.loadUserDetails();
    this.loadAffiliateRelationship();
    this.loadNotificationPreferences();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.loadingService.hide();
    this.toolbarService.clearToolbarComponent();
  }

  private loadUserDetails() {
    this.userService.loadUserDetails();
    this.subscriptions.add(
      this.userService.loadUserEmailChangePending().subscribe({
        next: (emailChangePendingDetails) => {
          this.emailChangePending = emailChangePendingDetails;
        },
        error: (err) => {
          console.error('Failed to load email change pending:', err);
        },
      }),
    );
    this.emailChangePending = this.userService.emailChangePendingDetails;
  }

  private loadAffiliateRelationship() {
    this.subscriptions.add(
      this.affiliateService.getMyAffiliateRelationship().subscribe({
        next: (relationship) => {
          this.affiliateRelationship = relationship;
        },
        error: () => {
          // Silently fail - not critical for profile page
        },
      }),
    );
  }

  private loadNotificationPreferences() {
    this.subscriptions.add(
      this.userService.getUserPreferences().subscribe({
        next: (preferences: UserPreferences) => {
          // Store phone verification state
          this.phoneNumber = preferences.sms.phoneNumber || null;
          this.phoneVerified = preferences.sms.isVerified || false;

          // Update notification preferences form
          this.notificationPreferencesForm.patchValue({
            lowBalanceAlerts: preferences.email.lowBalanceAlerts,
            lowBalanceSms: preferences.sms.lowBalanceSms,
            newsletter: preferences.email.newsletter,
            marketingEmails: preferences.email.marketingEmails,
          });

          // Update phone verification form
          this.phoneVerificationForm.patchValue({
            phoneNumber: this.phoneNumber || '',
          });

          // Update SMS checkbox state based on phone validity
          setTimeout(() => this.updateSmsCheckboxState(), 0);
        },
        error: (err) => {
          console.error('Failed to load notification preferences:', err);
        },
      }),
    );
  }

  onSubmitNotificationPreferences(): void {
    const formValue = this.notificationPreferencesForm.value;
    const phoneNumber = this.userDetailForm.get('phoneNumber')?.value?.trim() || '';

    // Update email preferences
    this.subscriptions.add(
      this.userService
        .updateEmailPreferences(formValue.lowBalanceAlerts, formValue.newsletter, formValue.marketingEmails)
        .subscribe({
          next: () => {
            // Then update SMS preferences
            this.updateSmsPrefs(phoneNumber, formValue.lowBalanceSms);
          },
          error: (err) => {
            this.messageService.error(`Failed to update email preferences: ${err.message}`);
          },
        }),
    );
  }

  private updateSmsPrefs(phoneNumber: string, lowBalanceSms: boolean): void {
    this.subscriptions.add(
      this.userService.updateSmsPreferences(phoneNumber, lowBalanceSms).subscribe({
        next: () => {
          this.messageService.success('Notification preferences updated successfully');
        },
        error: (err) => {
          this.messageService.error(`Failed to update SMS preferences: ${err.message}`);
        },
      }),
    );
  }

  /**
   * Save phone number to SMS preferences
   */
  onSubmitPhoneNumber(): void {
    if (this.phoneVerificationForm.invalid || this.savingPhone) {
      return;
    }

    const newPhoneNumber = this.phoneVerificationForm.get('phoneNumber')?.value?.trim() || '';
    this.savingPhone = true;

    this.subscriptions.add(
      this.userService.updateSmsPreferences(newPhoneNumber).subscribe({
        next: () => {
          this.savingPhone = false;
          this.phoneNumber = newPhoneNumber || null;
          this.phoneVerified = false; // Reset verification when phone changes
          this.showVerificationInput = false;
          this.messageService.success('Phone number saved. Click "Send Verification Code" to verify.');
        },
        error: (err) => {
          this.savingPhone = false;
          this.messageService.error(`Failed to save phone number: ${err.message}`);
        },
      }),
    );
  }

  /**
   * Send SMS verification code to user's phone
   */
  sendVerificationCode(): void {
    if (this.sendingCode) {
      return;
    }

    this.sendingCode = true;

    this.subscriptions.add(
      this.userService.sendSmsVerification().subscribe({
        next: () => {
          this.sendingCode = false;
          this.showVerificationInput = true;
          this.messageService.success('Verification code sent to your phone.');
        },
        error: (err) => {
          this.sendingCode = false;
          this.messageService.error(`Failed to send verification code: ${err.message}`);
        },
      }),
    );
  }

  /**
   * Verify phone number with code
   */
  verifyPhone(): void {
    const code = this.phoneVerificationForm.get('verificationCode')?.value?.trim();
    if (!code || this.verifyingPhone) {
      return;
    }

    this.verifyingPhone = true;

    this.subscriptions.add(
      this.userService.verifyPhoneNumber(code).subscribe({
        next: () => {
          this.verifyingPhone = false;
          this.phoneVerified = true;
          this.showVerificationInput = false;
          this.phoneVerificationForm.get('verificationCode')?.reset();
          this.messageService.success('Phone number verified successfully!');
          // Reload preferences to update state
          this.loadNotificationPreferences();
        },
        error: (err) => {
          this.verifyingPhone = false;
          this.messageService.error(`Verification failed: ${err.message}`);
        },
      }),
    );
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
      this.subscriptions.add(
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
        }),
      );
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

      this.subscriptions.add(
        this.userService.changePassword(newPassword).subscribe({
          next: () => {
            this.messageService.success('Password changed successfully.');
            window.location.reload();
          },
          error: (err) => {
            console.error('Failed to change password:', err);
            this.messageService.error('Failed to change password. Please try again.');
          },
        }),
      );
    } else {
      this.messageService.error('Please enter valid password details.');
    }
  }

  openExportPersonalDialog() {
    const dialogRef = this.dialog.open(ExportPersonalDialogComponent, {
      width: '500px',
      data: { password: this.userDetailForm.get('password')?.value },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        this.exportDialog();
      }
    });
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
          const deletePodcastNames = data.deletingPodcasts.map((podcast) => podcast.name);
          const leavingPodcastNames = data.leavingPodcasts.map((podcast) => podcast.name);
          this.openDeleteConfirmationDialog(deleteTeamNames, leavingTeamNames, deletePodcastNames, leavingPodcastNames);
        },
        error: (err) => {
          this.messageService.error('Failed to load teams: ' + err.message);
        },
      }),
    );
  }

  openDeleteConfirmationDialog(
    deletingTeams: (string | null)[],
    leavingTeams: (string | null)[],
    deletingPodcasts: (string | null)[],
    leavingPodcasts: (string | null)[],
  ) {
    const email = this.userDetailForm.get('email')?.value;
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      panelClass: 'delete-confirmation-dialog',
      width: '500px',
      data: {
        message:
          "<h3 class='deleteModal'>Removing your account '" +
          email +
          "' will result in the following actions:</h3>" +
          (deletingTeams?.length === 0
            ? 'You are not the sole owner of any teams, so no teams will be deleted.'
            : "You are the sole owner of the following team(s) and they will be permanently deleted: '" +
              deletingTeams.join("', '") +
              "'") +
          '<br/><br/>' +
          (leavingTeams?.length === 0
            ? 'You will not be removed from any teams.'
            : "You will be removed from team(s): '" + leavingTeams.join("', '") + "'") +
          '<br/><br/>' +
          (deletingPodcasts?.length === 0
            ? 'These teams are not the owner of any podcasts, so no podcasts will be deleted.'
            : "The teams that will be deleted own the following podcast(s) and they will be permanently deleted: '" +
              deletingPodcasts.join("', '") +
              "'<h3 class='danger'>WARNING: The deleted podcast's episodes and audio files will also be " +
              'permanently deleted.</h3>') +
          (leavingPodcasts?.length === 0
            ? 'You will not be removed from any podcasts.'
            : "You will be removed from podcast(s): '" + leavingPodcasts.join("', '") + "'") +
          '<br/><br/>' +
          ' None of these actions can be undone.' +
          '<h2>Are you sure you want to proceed?</h2>',
      },
    });
    this.subscriptions.add(
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
      }),
    );
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

  refreshOrder(id: string) {
    this.subscriptions.add(
      this.creditService.refreshUserOrder(id).subscribe({
        next: (data) => {
          this.messageService.success(`Order refreshed successfully: ${data.message}`);
        },
        error: (err) => {
          this.messageService.error('Failed to refresh order: ' + err.message);
        },
      }),
    );
  }

  cancelOrder(id: string) {
    this.subscriptions.add(
      this.creditService.cancelUserOrder(id).subscribe({
        next: () => this.messageService.success('Order cancelled successfully'),
        error: (err) => this.messageService.error('Failed to cancel order: ' + err.message),
      }),
    );
  }

  openDeleteAccountDialog() {
    const dialogRef = this.dialog.open(DeleteAccountDialogComponent, {
      width: '500px',
      data: { email: this.userDetailForm.get('email')?.value },
    });
    dialogRef.afterClosed().subscribe((result: string | false) => {
      if (typeof result === 'string' && result) {
        this.deleteConfirmation = result;
        this.deleteAccount();
      }
    });
  }

  deleteAccount() {
    this.deleteDialog();
  }

  /**
   * Check if the phone number is valid (matches pattern and not empty)
   */
  isPhoneNumberValid(): boolean {
    const phoneControl = this.userDetailForm.get('phoneNumber');
    const phoneValue = phoneControl?.value?.trim();

    // Phone is valid if it's not empty and has no validation errors
    return !!phoneValue && phoneControl?.valid === true;
  }

  /**
   * Update the SMS checkbox state based on phone number validity
   */
  private updateSmsCheckboxState(): void {
    const lowBalanceSmsControl = this.notificationPreferencesForm.get('lowBalanceSms');

    if (!lowBalanceSmsControl) {
      return;
    }

    if (!this.isPhoneNumberValid()) {
      // Disable and uncheck if phone is invalid
      lowBalanceSmsControl.disable();
      if (lowBalanceSmsControl.value) {
        lowBalanceSmsControl.setValue(false);
      }
    } else {
      // Enable if phone is valid
      lowBalanceSmsControl.enable();
    }
  }

  /**
   * Get tooltip text for SMS checkbox
   */
  getLowBalanceSmsTooltip(): string {
    return this.isPhoneNumberValid() ? '' : 'Please add a valid phone number in User Details section';
  }
}
