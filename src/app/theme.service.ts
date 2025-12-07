// Copyright (c) 2025 Perpetuator LLC
import { Injectable, Renderer2, RendererFactory2, signal, WritableSignal, OnDestroy } from '@angular/core';

import { UserService } from './user/user.service';
import { Subscription } from 'rxjs';
import { AuthService } from './auth/auth.service';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private renderer: Renderer2;
  private subscriptions = new Subscription();
  private currentThemeSignal: WritableSignal<Theme> = signal('dark');

  get theme(): WritableSignal<Theme> {
    return this.currentThemeSignal;
  }

  set theme(theme: WritableSignal<Theme>) {
    this.currentThemeSignal = theme;
  }

  constructor(
    rendererFactory: RendererFactory2,
    private userSettingService: UserService,
    private authService: AuthService,
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    const localTheme = this.loadThemeFromLocalStorage();
    this.setTheme(localTheme);
    this.loadTheme();
  }

  private applyTheme(): void {
    const body = document.body;
    this.renderer.removeClass(body, 'light');
    this.renderer.removeClass(body, 'dark');
    this.renderer.addClass(body, this.theme());
  }

  private saveThemeToLocalStorage(theme: Theme): void {
    // Optimize: Only save light theme preference
    // Dark is the default, so no need to store it
    if (theme === 'light') {
      localStorage.setItem('theme', 'light');
    } else {
      localStorage.removeItem('theme');
    }
  }

  private loadThemeFromLocalStorage(): Theme {
    const storedTheme = localStorage.getItem('theme') as Theme;
    // If 'light' is stored, use it. Otherwise default to 'dark'
    if (storedTheme === 'light') {
      return 'light';
    }
    return 'dark'; // Default to dark mode
  }

  setTheme(theme: Theme): void {
    this.currentThemeSignal.set(theme);
    this.saveThemeToLocalStorage(theme);
    this.applyTheme();
    if (!this.authService.isLoggedIn()) {
      return; // User not logged in, skipping user preferences update
    }
    this.subscriptions.add(
      this.userSettingService.updateUserSetting('theme', theme).subscribe({
        error: (error) => {
          console.error('Failed to update user theme preference:', error);
        },
      }),
    );
  }

  loadTheme(): void {
    if (!this.authService.isLoggedIn()) {
      // User not logged in, loading theme from local storage
      const localTheme = this.loadThemeFromLocalStorage();
      this.setTheme(localTheme);
      return;
    }
    this.subscriptions.add(
      this.userSettingService.userSettings(['theme']).subscribe({
        next: (results) => {
          const themeSetting = results.find((setting) => setting.key === 'theme');
          if (!themeSetting?.value) {
            // No theme preference saved, use local storage
            const localTheme = this.loadThemeFromLocalStorage();
            this.setTheme(localTheme);
            return;
          }
          const theme: string = themeSetting.value.toLowerCase();
          if (theme !== 'light' && theme !== 'dark') {
            console.error('Invalid theme setting:', theme);
            // Fall back to local storage
            const localTheme = this.loadThemeFromLocalStorage();
            this.setTheme(localTheme);
            return;
          }
          this.setTheme(theme);
        },
        error: () => {
          // User preferences load failed, reverting to local storage loaded
          const localTheme = this.loadThemeFromLocalStorage();
          this.setTheme(localTheme);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
