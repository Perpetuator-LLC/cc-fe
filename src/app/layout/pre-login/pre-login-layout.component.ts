// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SharedFooterComponent } from '../shared-footer/shared-footer.component';
import { ThemeService, Theme } from '../theme.service';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { AudioPlayerBarComponent } from '../../shared/audio-player/audio-player-bar.component';

@Component({
  selector: 'app-pre-login-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatTooltip,
    MatIconModule,
    MatButtonModule,
    SharedFooterComponent,
    AudioPlayerBarComponent,
  ],
  templateUrl: './pre-login-layout.component.html',
  styleUrls: ['./pre-login-layout.component.scss'],
})
export class PreLoginLayoutComponent implements OnInit, OnDestroy {
  protected currentTheme = this.themeService.theme;
  isHomePage = false;
  isLoginPage = false;
  isRegisterPage = false;
  private subscriptions = new Subscription();

  constructor(
    private themeService: ThemeService,
    private router: Router,
  ) {
    this.checkHomePage();
    this.checkLoginPage();
    this.checkRegisterPage();
  }

  ngOnInit() {
    this.currentTheme = this.themeService.theme;

    this.subscriptions.add(
      this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
        this.checkHomePage();
        this.checkLoginPage();
        this.checkRegisterPage();
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private checkHomePage(): void {
    const url = this.router.url;
    this.isHomePage = url === '/' || url === '/home' || url.startsWith('/home?');
  }

  private checkLoginPage(): void {
    const url = this.router.url;
    this.isLoginPage = url === '/login' || url.startsWith('/login?');
  }

  private checkRegisterPage(): void {
    const url = this.router.url;
    this.isRegisterPage = url === '/register' || url.startsWith('/register?');
  }

  switchTheme(theme: Theme): void {
    this.currentTheme.set(theme);
    this.themeService.setTheme(theme);
  }
}
