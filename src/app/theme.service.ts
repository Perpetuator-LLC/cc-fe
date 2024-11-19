import { Injectable, Renderer2, RendererFactory2, signal, WritableSignal, OnDestroy } from '@angular/core';

import { UserService } from './user.service';
import { Subscription } from 'rxjs';
import { AuthService } from './auth.service';

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
    localStorage.setItem('theme', theme);
  }

  private loadThemeFromLocalStorage(): Theme {
    const storedTheme = localStorage.getItem('theme') as Theme;
    return storedTheme || this.theme();
  }

  setTheme(theme: Theme): void {
    this.currentThemeSignal.set(theme);
    this.saveThemeToLocalStorage(theme);
    this.applyTheme();
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, skipping user preferences update');
      return;
    }
    this.userSettingService.updateUserSetting('theme', theme);
  }

  loadTheme(): void {
    if (!this.authService.isLoggedIn()) {
      console.log('User not logged in, loading theme from local storage');
      const localTheme = this.loadThemeFromLocalStorage();
      this.setTheme(localTheme);
      return;
    }
    this.subscriptions.add(
      this.userSettingService.getUserSettings(['theme']).subscribe({
        next: (results) => {
          const themeSetting = results.find((setting) => setting.key === 'theme');
          const theme: string | undefined = themeSetting?.value.toLowerCase();
          if (theme !== 'light' && theme !== 'dark') {
            console.error('Invalid theme setting:', theme);
            return;
          }
          console.log('User preferences loaded');
          this.setTheme(theme);
        },
        error: () => {
          // console.error(`Failed to fetch user preferences: ${data}`);
          const localTheme = this.loadThemeFromLocalStorage();
          console.log('User preferences load failed, reverting to local storage loaded');
          this.setTheme(localTheme);
        },
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
