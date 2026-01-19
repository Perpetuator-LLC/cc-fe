// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NewsletterHttpService } from '../newsletter-http.service';

type UnsubscribeState = 'loading' | 'success' | 'error' | 'not-found' | 'missing-email';

@Component({
  selector: 'app-newsletter-unsubscribe',
  standalone: true,
  imports: [CommonModule, RouterLink, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './newsletter-unsubscribe.component.html',
  styleUrl: './newsletter-unsubscribe.component.scss',
})
export class NewsletterUnsubscribeComponent implements OnInit {
  state: UnsubscribeState = 'loading';
  email: string | null = null;
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private newsletterHttpService: NewsletterHttpService,
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email');

    if (!this.email) {
      this.state = 'missing-email';
      return;
    }

    this.unsubscribe(this.email);
  }

  private unsubscribe(email: string): void {
    this.state = 'loading';
    this.newsletterHttpService.unsubscribe(email).subscribe({
      next: (response) => {
        if (response.success) {
          this.state = 'success';
        } else {
          this.state = 'error';
          this.errorMessage = response.message || 'Failed to unsubscribe. Please try again later.';
        }
      },
      error: (err) => {
        // Handle 404 - email not found in subscribers
        if (err.status === 404) {
          this.state = 'not-found';
          this.errorMessage = 'This email is not subscribed to our newsletter.';
        } else {
          this.state = 'error';
          this.errorMessage = err.error?.message || 'Failed to unsubscribe. Please try again later.';
        }
      },
    });
  }

  retry(): void {
    if (this.email) {
      this.unsubscribe(this.email);
    }
  }
}
