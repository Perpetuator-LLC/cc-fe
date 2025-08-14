// Copyright (c) 2025 Perpetuator LLC
import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';
import { CommonModule } from '@angular/common';
import { PreLoginLayoutComponent } from './pre-login-layout/pre-login-layout.component';
import { CookieBannerComponent } from './cookie-banner/cookie-banner.component';
import { MessageComponent } from './message/message.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    LayoutComponent,
    PreLoginLayoutComponent,
    CookieBannerComponent,
    MessageComponent,
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'Capital Copilot';
  constructor(public router: Router) {}

  get isLoginRoute(): boolean {
    return (
      this.router.url.startsWith('/login') ||
      this.router.url.startsWith('/register') ||
      this.router.url.startsWith('/forgot')
    );
  }
}
