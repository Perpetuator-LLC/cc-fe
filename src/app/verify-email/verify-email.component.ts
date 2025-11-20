// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from '../message.service';
import { GraphqlAuthService } from '../graphql-auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss',
})
export class VerifyEmailComponent implements OnInit {
  verificationStatus = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private messageService: MessageService,
    private graphqlAuthService: GraphqlAuthService,
  ) {}

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
          this.messageService.addMessage({
            type: 'success',
            text: 'Email verified successfully! You can now log in.',
            dismissible: true,
          });
          this.router.navigate(['/home']);
        } else {
          this.verificationStatus = 'Email verification failed. Please try again.';
        }
      },
      error: (error: unknown) => {
        console.debug('Email verification error:', error);
        this.verificationStatus = 'Email verification failed. Please try again.';
      },
    });
  }
}
