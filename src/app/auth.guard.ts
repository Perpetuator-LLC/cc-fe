// import { CanActivateFn } from '@angular/router';
//
// export const authGuard: CanActivateFn = (route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
//   return true;
// };

import { Injectable } from '@angular/core';
import { CanActivate, UrlTree, Router } from '@angular/router';
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
    return ['logout', 'charts', 'times', 'valuation', 'crypto-news', 'crypto-articles'];
  }

  static getLoggedOutRoutes(): string[] {
    return ['home', 'login', 'register'];
  }

  canActivate() // route: ActivatedRouteSnapshot, state: RouterStateSnapshot,
  : Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const isLoggedIn = this.authService.isLoggedIn();

    if (!isLoggedIn) {
      console.debug('AuthGuard: Redirecting to login page');
      this.router.navigate(['/login']);
    }

    return isLoggedIn;
    // NOTE: No need to verify the routeConfig path, as the AuthGuard is only used for the routes that require
    // authentication, these are controlled via the routes array in app.routes.ts
    //if (AuthGuard.getAuthRequiredRoutes().some((r) => route.routeConfig?.path == r)) {
    //  if (!this.authService.isLoggedIn()) {
    //    this.router.navigate(['/login']);
    //    return false;
    //  }
    //}
    //return true;
  }
}
