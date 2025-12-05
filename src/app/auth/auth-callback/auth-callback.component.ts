// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OAuthAuthService } from '../../core/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss',
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
