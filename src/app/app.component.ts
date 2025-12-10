// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { PostLoginLayoutComponent } from './layout/post-login/post-login-layout.component';
import { CommonModule } from '@angular/common';
import { PreLoginLayoutComponent } from './layout/pre-login/pre-login-layout.component';
import { CookieBannerComponent } from './policy/cookie-banner/cookie-banner.component';
import { MessageComponent } from './message/message.component';
import { AuthService } from './auth/auth.service';
import { PolicyGuardService } from './policy/services/policy-guard.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    PostLoginLayoutComponent,
    PreLoginLayoutComponent,
    CookieBannerComponent,
    MessageComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Capital Copilot';
  constructor(
    public router: Router,
    private authService: AuthService,
    private policyGuardService: PolicyGuardService,
  ) {
    // PolicyGuardService is injected to initialize policy checking on navigation
  }

  get isLoginRoute(): boolean {
    // Routes that are always pre-login layout regardless of auth state
    const alwaysPreLoginRoutes = [
      '/login',
      '/register',
      '/forgot',
      '/reset',
      '/resend',
      '/verify',
      '/change-email',
      '/cancel-change-email',
    ];

    // Check if current route is always pre-login
    if (alwaysPreLoginRoutes.some((route) => this.router.url.startsWith(route))) {
      return true;
    }

    // Routes that should use pre-login layout only when NOT logged in
    const conditionalRoutes: (string | RegExp)[] = [
      '/',
      '/home',
      '/privacy-policy',
      '/cookie-policy',
      '/terms-and-conditions',
      /^\/a\/.+/, // Affiliate landing pages (/a/:code)
      /^\/podcasts(\/|$)/, // Public podcast pages
      /^\/episodes(\/|$)/, // Public episode pages
      /^\/categories(\/|$)/, // Public category pages
      /^\/finance(\/|$)/, // Public finance page
      /^\/dev\//, // Dev tools (buttons showcase, etc.)
    ];

    // If on a conditional route and user is NOT logged in, use pre-login layout
    const isConditionalRoute = conditionalRoutes.some((route) => {
      if (route instanceof RegExp) {
        return route.test(this.router.url);
      }
      return (
        this.router.url === route || this.router.url.startsWith(route + '?') || this.router.url.startsWith(route + '#')
      );
    });

    if (isConditionalRoute) {
      return !this.authService.isLoggedIn();
    }

    return false;
  }
}
