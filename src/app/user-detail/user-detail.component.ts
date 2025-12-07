// Copyright (c) 2025 Perpetuator LLC
import { Component, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetails, UserService, UserPreferences } from '../user.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TeamsService } from '../teams.service';
import { CreditService } from '../credit.service';
import { CodeService } from '../code.service';
import { MatIcon } from '@angular/material/icon';
import { DeleteAccountDialogComponent } from '../delete-account-dialog/delete-account-dialog.component';
import { ExportPersonalDialogComponent } from '../export-personal-dialog/export-personal-dialog.component';
import { LoadingService } from '../loading.service';
import { AffiliateService, AffiliateRelationship } from '../affiliate/affiliate.service';
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
    MatTooltip,
    RouterLink,
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})
export class UserDetailComponent implements OnInit, OnDestroy {
  emailChangePending: { newEmail: string } | null = null;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  userDetailForm: FormGroup;
  changePasswordForm: FormGroup;
  notificationPreferencesForm: FormGroup;
  deleteConfirmation = '';
  exportConfirmation = '';
  private subscriptions = new Subscription();
  private downloadAnchor: HTMLAnchorElement | null = null;
  // protected orders: UserOrders[] = [];
  protected loadingOrders = true;
  loading = false;
  affiliateRelationship: AffiliateRelationship | null = null;

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
    protected creditService: CreditService,
    private codeService: CodeService,
    private loadingService: LoadingService,
    private affiliateService: AffiliateService,
  ) {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '' }],
      phoneNumber: ['', [Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
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
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
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
          const phoneNumber = preferences.sms.phoneNumber || '';

          // Update notification preferences form
          this.notificationPreferencesForm.patchValue({
            lowBalanceAlerts: preferences.email.lowBalanceAlerts,
            lowBalanceSms: preferences.sms.lowBalanceSms,
            newsletter: preferences.email.newsletter,
            marketingEmails: preferences.email.marketingEmails,
          });

          // Update phone number in user details form
          this.userDetailForm.patchValue({
            phoneNumber: phoneNumber,
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
      const { username, email, phoneNumber } = this.userDetailForm.value;
      this.subscriptions.add(
        this.userService.updateUser(username, email).subscribe({
          next: (response) => {
            if (response.success) {
              // After updating user details, also update phone number in SMS preferences
              const currentSmsEnabled = this.notificationPreferencesForm.get('lowBalanceSms')?.value || false;
              const phoneValue = phoneNumber?.trim() || '';

              this.subscriptions.add(
                this.userService.updateSmsPreferences(phoneValue, currentSmsEnabled).subscribe({
                  next: () => {
                    this.messageService.success('User details and phone number updated successfully.');
                  },
                  error: (err) => {
                    const msg = `User details updated, but failed to update phone number: ${err.message}`;
                    this.messageService.warning(msg);
                  },
                }),
              );

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
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
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
