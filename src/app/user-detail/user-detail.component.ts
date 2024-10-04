import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserSettingService } from '../user-setting.service';
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
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  userDetailForm: FormGroup;
  changePasswordForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private userSettingService: UserSettingService,
    private messageService: MessageService,
    private toolbarService: ToolbarService,
  ) {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      // email: ['', [Validators.required, Validators.email]],
    });

    this.changePasswordForm = this.fb.group(
      {
        email: [''],
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.messageService.clearMessages();
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.loadUserDetails();
  }

  loadUserDetails(): void {
    this.userSettingService.getUserDetails().subscribe({
      next: (userDetails) => {
        this.userDetailForm.patchValue({
          username: userDetails.username,
          email: userDetails.email,
        });
        this.changePasswordForm.patchValue({
          email: userDetails.email,
        });
      },
      error: (err) => {
        console.error('Failed to load user details:', err);
      },
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    return formGroup.get('newPassword')?.value === formGroup.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  onSubmitUserDetails(): void {
    if (this.userDetailForm.valid) {
      const { username, email } = this.userDetailForm.value;
      const fixedEmail = email ? email : this.changePasswordForm.get('email')?.value;
      this.userSettingService.updateUserDetails(username, fixedEmail).subscribe({
        next: (response) => {
          if (response.success) {
            this.messageService.addMessage({
              type: 'success',
              text: 'User details updated successfully.',
              dismissible: true,
            });
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: `Failed to update user details. ${response.message}`,
              dismissible: true,
            });
          }
        },
        error: (err) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Failed to update user details. ${err.message}`,
            dismissible: true,
          });
        },
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

      // Call the backend service to change the password
      // Assuming a method `changePassword` exists in `UserSettingService`
      this.userSettingService.changePassword(newPassword).subscribe({
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
