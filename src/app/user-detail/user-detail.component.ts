import { Component, effect, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserDetails, UserService } from '../user.service';
import { MatCard } from '@angular/material/card';
import { MatError, MatFormField, MatHint } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';

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
  ],
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
})
export class UserDetailComponent implements OnInit {
  emailChangePending: { newEmail: string } | null = null;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  userDetailForm: FormGroup;
  changePasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
  ) {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '' }],
    });

    this.changePasswordForm = this.fb.group(
      {
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

  private loadUserDetails() {
    this.userService.loadUserDetails();
    this.userService.loadUserEmailChangePending().subscribe({
      next: (emailChangePendingDetails) => {
        this.emailChangePending = emailChangePendingDetails;
        console.debug('Email change pending:', this.emailChangePending);
      },
      error: (err) => {
        console.error('Failed to load email change pending:', err);
      },
    });
    this.emailChangePending = this.userService.emailChangePendingDetails;
    console.debug('Email change pending initial value:', this.emailChangePending);
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
      this.userService.updateUserDetails(username, email).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.success('User details updated successfully.');
            this.userService.loadUserDetails().subscribe({
              next: (userDetails: UserDetails) => {
                this.userDetailForm.patchValue({
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
          this.messageService.error('Failed to update user details. Please try again.');
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
}
