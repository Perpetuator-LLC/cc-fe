// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { CanActivate, UrlTree, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { OAuthService } from './oauth.service';
import { AffiliateStorageService } from '../affiliate/affiliate-storage.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private router = inject(Router);
  private authService = inject(OAuthService);
  private affiliateStorageService = inject(AffiliateStorageService);

  static getAuthRequiredRoutes(): string[] {
    return ['logout', 'media', 'teams', 'jobs'];
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
