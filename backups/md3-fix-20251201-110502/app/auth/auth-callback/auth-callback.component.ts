// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthAuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-container">
      <h2>Completing login...</h2>
      <p>Please wait while we redirect you.</p>
    </div>
  `,
  styles: [
    `
      .callback-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        gap: 16px;
      }
    `,
  ],
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private authService: OAuthAuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // OAuth service handles the callback automatically
    // Just wait a moment and redirect to home or intended page
    setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.router.navigate(['/']);
      } else {
        this.router.navigate(['/login']);
      }
    }, 1000);
  }
}
