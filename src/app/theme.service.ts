import { Injectable, Renderer2, RendererFactory2, signal, WritableSignal, OnDestroy } from '@angular/core';

import { UserPreferenceService } from './user-preference.service';
import { Subscription } from 'rxjs';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService implements OnDestroy {
  private renderer: Renderer2;
  private subscription: Subscription | undefined;
  private currentThemeSignal: WritableSignal<Theme> = signal('dark');

  get theme(): WritableSignal<Theme> {
    return this.currentThemeSignal;
  }

  set theme(theme: WritableSignal<Theme>) {
    this.currentThemeSignal = theme;
  }

  constructor(
    rendererFactory: RendererFactory2,
    private userPreferenceService: UserPreferenceService,
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
    // Update the theme in user preferences
    this.subscription = this.userPreferenceService
      .updateUserPreference('dark_mode', theme === 'dark' ? 'true' : 'false')
      .subscribe({
        next: (data) => {
          if (data.success) {
            console.log('User preferences updated');
          } else {
            // console.error('Failed to update user preferences');
          }
        },
        error: () => {
          // console.error(`Failed to update user preferences (error): ${data}`);
        },
      });
  }

  loadTheme(): void {
    // Fetch the user's preference for dark mode
    this.subscription = this.userPreferenceService.getUserPreferences(['dark_mode']).subscribe({
      next: (data) => {
        const darkModePreference = data.results.find((pref) => pref.key === 'dark_mode');
        const theme: Theme = darkModePreference?.value.toLowerCase() === 'true' ? 'dark' : 'light';
        console.log('User preferences loaded');
        this.setTheme(theme);
      },
      error: () => {
        // console.error(`Failed to fetch user preferences: ${data}`);
        const localTheme = this.loadThemeFromLocalStorage();
        console.log('User preferences load failed, but revert to local storage loaded');
        this.setTheme(localTheme);
      },
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
