// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { EMPTY, throwError } from 'rxjs';
import { MessageService } from './message.service';
import { handleApolloError } from './utils/error-handler';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  constructor(
    private router: Router,
    private authService: AuthService,
    private messageService: MessageService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public handleError(error: any) {
    const newError = handleApolloError(error);
    if (
      newError.message.includes('Given token not valid for any token type') ||
      newError.message.includes('Token is invalid or expired') ||
      newError.message.includes('Authentication credentials invalid or missing')
    ) {
      this.authService.logout(); // Clear authentication state
      this.router.navigate(['/login']); // Navigate to login page
      this.messageService.warning('Your session has expired. Please log in again.');
      return EMPTY;
    }
    console.error(newError);
    return throwError(() => newError);
  }
}
