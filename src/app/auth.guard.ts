// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { OAuthAuthService } from './core/services/auth.service';
import { AffiliateStorageService } from './affiliate-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: OAuthAuthService,
    private affiliateStorageService: AffiliateStorageService,
  ) {}

  static getAuthRequiredRoutes(): string[] {
    return ['logout', 'news', 'p', 'e', 'teams', 'jobs', 'f'];
  }

  static getLoggedOutRoutes(): string[] {
    return ['home', 'login', 'register'];
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const isLoggedIn = this.authService.isAuthenticated();

    if (!isLoggedIn) {
      console.debug('AuthGuard: Redirecting to login page');
      this.affiliateStorageService.setReturnUrl(state.url);
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    return true;
  }
}
