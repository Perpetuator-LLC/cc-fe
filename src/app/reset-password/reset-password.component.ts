// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { NgClass } from '@angular/common';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import { MatInput } from '@angular/material/input';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MessageComponent,
    NgClass,
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
  resetPasswordForm: FormGroup;
  uid: string | null = null;
  key: string | null = null;
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private messageService: MessageService,
  ) {
    this.resetPasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validator: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.uid = this.route.snapshot.queryParamMap.get('uid');
    this.key = this.route.snapshot.queryParamMap.get('token');

    if (!this.uid || !this.key) {
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

    if (!this.uid || !this.key) {
      this.messageService.addMessage({
        type: 'error',
        text: 'Invalid or missing reset link.',
        dismissible: true,
      });
      return;
    }

    this.isSubmitting = true;

    const url = `${environment.API_URL}/auth/password/reset/confirm/`;
    const payload = {
      uid: `${this.uid}`,
      token: this.key,
      new_password1: newPassword,
      new_password2: confirmPassword,
    };

    this.http.post(url, payload).subscribe({
      next: (response) => {
        console.debug('Password reset response:', response);
        this.messageService.addMessage({
          type: 'success',
          text: 'Password reset successfully! Redirecting to login...',
          dismissible: true,
        });
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        console.error('Password reset error:', error);
        this.isSubmitting = false;
        this.messageService.addMessage({
          type: 'error',
          text: 'Password reset failed. Please try again.',
          dismissible: true,
        });
      },
    });
  }
}
