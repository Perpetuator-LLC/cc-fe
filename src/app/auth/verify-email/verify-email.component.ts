// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GraphqlAuthService } from '../graphql-auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private graphqlAuthService = inject(GraphqlAuthService);

  verificationStatus = '';

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.verifyEmail(token);
    } else {
      this.verificationStatus = 'Invalid verification link.';
    }
  }

  verifyEmail(token: string): void {
    this.graphqlAuthService.verify(token).subscribe({
      next: (response: unknown) => {
        if (response) {
          console.debug('Email verification response:', response);
          this.verificationStatus = 'Email verified successfully!';
          // Message already added by GraphqlAuthService.verify()
          this.router.navigate(['/home']);
        } else {
          this.verificationStatus = 'Email verification failed. Please try again.';
        }
      },
      error: (error: unknown) => {
        console.debug('Email verification error:', error);
        this.verificationStatus = 'Email verification failed. Please try again.';
        // Error message already added by GraphqlAuthService.verify()
      },
    });
  }
}
