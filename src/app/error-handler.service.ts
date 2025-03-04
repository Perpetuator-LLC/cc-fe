// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleError(error: any) {
    console.error('GraphQL query error:', error);
    let errorMessage = 'Unknown error';

    if (error.graphQLErrors) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errorMessage = error.graphQLErrors.map((e: any) => e.message).join(', ');
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Check for specific error indicating invalid or expired token
    if (
      errorMessage.includes('Given token not valid for any token type') ||
      errorMessage.includes('Token is invalid or expired') ||
      errorMessage.includes('Authentication credentials invalid or missing')
    ) {
      this.authService.logout(); // Clear authentication state
      this.router.navigate(['/login']); // Navigate to login page
    }

    return throwError(() => new Error(errorMessage));
  }
}
