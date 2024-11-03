import { Component, effect, OnInit, TemplateRef, ViewChild } from '@angular/core'; // Add WritableSignal import
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../user.service';
import { MatCard } from '@angular/material/card';
import { MatError, MatFormField } from '@angular/material/form-field';
import { MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageComponent } from '../message/message.component';
import { MessageService } from '../message.service';
import { ToolbarService } from '../toolbar.service';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [MatCard, ReactiveFormsModule, MatFormField, MatInput, MatButton, MatLabel, MessageComponent, MatError],
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
  }

  ngOnInit(): void {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadUserDetails();
  }

  private loadUserDetails() {
    this.userService.loadUserDetails((userDetails: { username: string; email: string }) => {
      console.debug('User details:', userDetails);
    });
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
    return formGroup.get('newPassword')?.value === formGroup.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  cancelEmailChange(): void {
    this.messageService.clearMessages();
    this.userService.cancelEmailChange().subscribe({
      next: (response) => {
        console.log('Email change cancel:', response);
        this.loadUserDetails();
        this.messageService.addMessage({
          type: 'success',
          text: 'Email change cancelled.',
          dismissible: true,
        });
      },
      error: (err) => {
        console.error('Failed to cancel email change:', err);
        this.messageService.addMessage({
          type: 'error',
          text: 'Failed to cancel email change request. Please try again.',
          dismissible: true,
        });
      },
    });
  }

  resendEmailChange(): void {
    this.userService.resendEmailChange().subscribe({
      next: (response) => {
        console.log('Email change reset:', response);
        this.messageService.addMessage({
          type: 'success',
          text: 'Email change request resent',
          dismissible: true,
        });
      },
      error: (err) => {
        console.error('Failed to reset email change:', err);
        this.messageService.addMessage({
          type: 'error',
          text: 'Failed to reset email change request. Please try again.',
          dismissible: true,
        });
      },
    });
  }

  onSubmitUserDetails(): void {
    this.messageService.clearMessages();
    if (this.userDetailForm.valid) {
      const { username, email } = this.userDetailForm.value;
      console.log('Updating user details:', username, email);
      this.userService.updateUserDetails(username, email).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.addMessage({
              type: 'success',
              text: 'User details updated successfully.',
              dismissible: true,
            });
            this.userService.loadUserDetails((userDetails: { username: string; email: string }) => {
              this.userDetailForm.patchValue({
                username: userDetails.username,
                email: userDetails.email,
              });
            });
            this.userService.loadUserEmailChangePending().subscribe({
              next: (emailChangePendingDetails) => {
                this.emailChangePending = emailChangePendingDetails;
                console.log('Email change pending:', this.emailChangePending);
              },
              error: (err) => {
                console.error('Failed to load email change pending:', err);
              },
            });
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to update user details: ${response.message}`,
              dismissible: true,
            });
          }
        },
        error: (err) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Error updating user details. ${err.message}`,
            dismissible: true,
          });
        },
      });
    } else {
      this.messageService.addMessage({
        type: 'error',
        text: 'Please enter valid user details.',
        dismissible: true,
      });
    }
  }

  onSubmitPasswordChange(): void {
    if (this.changePasswordForm.valid) {
      const newPassword = this.changePasswordForm.get('newPassword')?.value;
      const confirmPassword = this.changePasswordForm.get('confirmPassword')?.value;

      if (newPassword !== confirmPassword) {
        this.messageService.addMessage({
          type: 'error',
          text: 'Passwords do not match.',
          dismissible: true,
        });
        return;
      }

      this.userService.changePassword(newPassword).subscribe({
        next: (response) => {
          console.log('Password changed successfully:', response);
          this.messageService.addMessage({
            type: 'success',
            text: 'Password changed successfully.',
            dismissible: true,
          });
        },
        error: (err) => {
          console.error('Failed to change password:', err);
          this.messageService.addMessage({
            type: 'error',
            text: 'Failed to change password. Please try again.',
            dismissible: true,
          });
        },
      });
    }
  }
}
