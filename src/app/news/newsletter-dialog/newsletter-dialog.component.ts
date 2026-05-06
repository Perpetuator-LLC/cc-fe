// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { UserService } from '../../user/user.service';
import { NewsletterHttpService, NewsletterResponse } from '../newsletter-http.service';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-newsletter-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './newsletter-dialog.component.html',
  styleUrls: ['./newsletter-dialog.component.scss'],
})
export class NewsletterDialogComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private dialogRef = inject<MatDialogRef<NewsletterDialogComponent>>(MatDialogRef);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private newsletterHttpService = inject(NewsletterHttpService);
  private messageService = inject(MessageService);

  newsletterForm: FormGroup;
  loading = false;
  isAuthenticated = false;
  private subscriptions = new Subscription();

  constructor() {
    this.isAuthenticated = this.authService.isLoggedIn();

    this.newsletterForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });

    if (this.isAuthenticated) {
      const userDetails = this.userService.userDetails();
      if (userDetails?.email) {
        this.newsletterForm.patchValue({ email: userDetails.email });
      }
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSubscribe(): void {
    if (this.newsletterForm.invalid) {
      return;
    }

    this.loading = true;
    this.messageService.clearMessages();

    const email = this.newsletterForm.value.email;

    if (this.isAuthenticated) {
      this.subscriptions.add(
        this.userService.subscribeToNewsletter(email).subscribe({
          next: () => {
            this.messageService.success('Successfully subscribed to newsletter!');
            this.dialogRef.close(true);
          },
          error: (err: Error) => {
            this.messageService.error(`Subscription failed: ${err.message}`);
            this.loading = false;
          },
        }),
      );
    } else {
      this.subscriptions.add(
        this.newsletterHttpService.subscribe(email).subscribe({
          next: (response: NewsletterResponse) => {
            if (response.success) {
              this.messageService.success(response.message || 'Successfully subscribed to newsletter!');
              this.dialogRef.close(true);
            } else {
              this.messageService.error(response.message || 'Subscription failed');
              this.loading = false;
            }
          },
          error: (err: Error) => {
            this.messageService.error(`Subscription failed: ${err.message || 'Unknown error'}`);
            this.loading = false;
          },
        }),
      );
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
