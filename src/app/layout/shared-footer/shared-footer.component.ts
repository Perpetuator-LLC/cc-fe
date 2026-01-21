// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/auth.service';

interface FooterLink {
  label: string;
  route: string;
  icon?: string;
  external?: boolean;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  devOnly?: boolean;
}

@Component({
  selector: 'app-shared-footer',
  standalone: true,
  imports: [CommonModule, MatToolbarModule, MatIconModule, RouterLink],
  templateUrl: './shared-footer.component.html',
  styleUrls: ['./shared-footer.component.scss'],
})
export class SharedFooterComponent {
  private authService = inject(AuthService);

  /** When true, shows only the copyright bar. When false, shows full footer with links. */
  @Input() compactMode = false;

  currentYear = new Date().getFullYear();
  isDev = !environment.production;

  // Main footer links
  legalLinks: FooterLink[] = [
    { label: 'Terms and Conditions', route: '/terms-and-conditions' },
    { label: 'Privacy Policy', route: '/privacy-policy' },
    { label: 'Cookie Policy', route: '/cookie-policy' },
  ];

  // Quick links
  quickLinks: FooterLink[] = [
    { label: 'Browse Podcasts', route: '/podcasts' },
    { label: 'Categories', route: '/categories' },
  ];

  // Dev-only links (visible only in development environment)
  devLinks: FooterLink[] = [
    { label: 'Theme Showcase', route: '/dev/theme', icon: 'palette', devOnly: true },
    { label: 'Button Showcase', route: '/dev/buttons', icon: 'smart_button', devOnly: true },
    { label: 'Charts Showcase', route: '/dev/charts', icon: 'analytics', devOnly: true },
    { label: 'Social Preview', route: '/dev/social-preview', icon: 'share', devOnly: true },
    { label: 'Affiliate Admin', route: '/affiliate-admin', icon: 'admin_panel_settings', devOnly: true },
  ];

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  get visibleDevLinks(): FooterLink[] {
    if (!this.isDev) return [];
    return this.devLinks;
  }
}
