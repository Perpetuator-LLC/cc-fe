// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../../message.service';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';
import { GraphqlAuthService } from '../graphql-auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,

    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatFormField,
    MatCardActions,
    MatError,
    MatButton,
    MatInput,
    MatLabel,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private graphqlAuthService = inject(GraphqlAuthService);

  resetPasswordForm: FormGroup;
  token: string | null = null;
  isSubmitting = false;

  constructor() {
    this.resetPasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.messageService.addMessage({
        type: 'error',
        text: 'Invalid or missing reset link.',
        dismissible: true,
      });
    }
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

  onSubmit(): void {
    this.messageService.clearMessages();
    if (this.resetPasswordForm.invalid) {
      this.messageService.addMessage({
        type: 'error',
        text: 'Please enter valid password details.',
        dismissible: true,
      });
      return;
    }

    const newPassword = this.resetPasswordForm.get('newPassword')?.value;
    const confirmPassword = this.resetPasswordForm.get('confirmPassword')?.value;

    if (!this.token) {
      this.messageService.addMessage({
        type: 'error',
        text: 'Invalid or missing reset link.',
        dismissible: true,
      });
      return;
    }

    this.isSubmitting = true;

    this.graphqlAuthService.resetPassword(this.token, newPassword, confirmPassword).subscribe({
      next: (success: boolean) => {
        if (success) {
          console.debug('Password reset successful');
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.isSubmitting = false;
        }
      },
      error: (error: unknown) => {
        console.error('Password reset error:', error);
        this.isSubmitting = false;
      },
    });
  }
}
