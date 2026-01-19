// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NewsletterHttpService } from '../newsletter-http.service';

type UnsubscribeState = 'loading' | 'success' | 'error' | 'missing-email';

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
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!this.email) {
      this.state = 'missing-email';
      return;
    }

    this.unsubscribe(this.email, token || undefined);
  }

  private unsubscribe(email: string, token?: string): void {
    this.state = 'loading';
    this.newsletterHttpService.unsubscribe(email, token).subscribe({
      next: (response) => {
        if (response.success) {
          this.state = 'success';
        } else {
          this.state = 'error';
          this.errorMessage = response.message || 'Failed to unsubscribe. Please try again later.';
        }
      },
      error: (err) => {
        this.state = 'error';
        this.errorMessage = err.error?.message || 'Failed to unsubscribe. Please try again later.';
      },
    });
  }

  retry(): void {
    if (this.email) {
      const token = this.route.snapshot.queryParamMap.get('token');
      this.unsubscribe(this.email, token || undefined);
    }
  }
}
