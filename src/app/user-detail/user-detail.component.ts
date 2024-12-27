import { Component, effect, OnInit, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetails, UserService } from '../user.service';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
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
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../auth.service';
import { TeamsService } from '../teams.service';

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
  private subscriptions = new Subscription();

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
    private dialog: MatDialog,
    private router: Router,
    private authService: AuthService,
    private teamService: TeamsService,
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

    effect(() => {
      const userData = this.userService.userDetails();
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
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadUserDetails();
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

  deleteDialog() {
    this.subscriptions.add(
      this.teamService.getDeleteUserResults().subscribe({
        next: (data) => {
          const deleteTeamNames = data.deletingTeams.map((team) => team.name);
          const leavingTeamNames = data.leavingTeams.map((team) => team.name);
          this.openConfirmationDialog(deleteTeamNames, leavingTeamNames);
        },
        error: (err) => {
          this.messageService.error('Failed to load teams: ' + err.message);
        },
      }),
    );
  }

  openConfirmationDialog(deletingTeams: (string | null)[], leavingTeams: (string | null)[]) {
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
              "'<br /><br/>WARNING: The deleted team's articles and audio files will also be permanently deleted.") +
          '<br/><br/>' +
          (leavingTeams?.length === 0
            ? 'You will not be removed from any teams.'
            : "You will be removed from team(s): '" + leavingTeams.join("', '") + "'") +
          '<br/><br/>' +
          ' None of these actions can be undone.</h3>' +
          '<br/><br/><h2>Are you sure you want to proceed?</h2>',
      },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        // get confirmation from user
        this.deleteTeam();
      }
    });
  }

  private deleteTeam() {
    this.subscriptions.add(
      this.userService.deleteUser(this.deleteConfirmation).subscribe({
        next: () => {
          this.messageService.success('Account deleted successfully');
          this.authService.logout();
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.messageService.error(`Failed to delete account: ${err.message}`);
        },
      }),
    );
  }
}
