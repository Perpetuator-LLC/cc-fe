// Copyright (c) 2025 Perpetuator LLC
// import { CanActivateFn } from '@angular/router';
//
// export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
//   return true;
// };

import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  static getAuthRequiredRoutes(): string[] {
    return ['logout', 'news', 'p', 'e', 'teams', 'jobs'];
  }

  static getLoggedOutRoutes(): string[] {
    return ['home', 'login', 'register'];
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const isLoggedIn = this.authService.isLoggedIn();

    if (!isLoggedIn) {
      console.debug('AuthGuard: Redirecting to login page');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }

    return true;
  }
}
