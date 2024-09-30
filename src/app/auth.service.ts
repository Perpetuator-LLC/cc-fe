import { Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { JWT, Token } from './types';
import { decodeJWT } from './jwt';
import { environment } from '../environments/environment';
import { MessageService } from './message.service';

export interface RegisterError {
  messages: string[];
}

export interface RegisterResponse {
  access?: string;
  detail?: string;
  refresh?: string;
}

export const AuthUrls = {
  login: environment.API_URL + '/auth/login/',
  refreshToken: environment.API_URL + '/auth/token/refresh/',
  register: environment.API_URL + '/auth/registration/',
  verify: environment.API_URL + '/auth/registration/verify-email/',
  resend: environment.API_URL + '/auth/registration/resend-email/',
  forgot: environment.API_URL + '/auth/password/reset/',
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(this.getToken());
  private loggedInSignal: WritableSignal<boolean> = signal(!this.isRefreshTokenExpired());

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
  ) {}

  forgot(email: string): Observable<RegisterResponse | null> {
    this.messageService.clearMessages();
    return this.http.post<RegisterResponse>(AuthUrls.forgot, { email }).pipe(
      tap((response) => {
        this.messageService.addMessage({
          type: 'info',
          text: response.detail ? response.detail : 'Password reset email sent',
          dismissible: true,
        });
      }),
      catchError((error) => {
        console.error('Login error:', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Login error (${key}): ${error.error[key]}`,
            dismissible: true,
          });
        });
        return of(null); // Ensuring that we always return an Observable of the same type
      }),
    );
  }

  login(email: string, password: string): Observable<Token | null> {
    this.messageService.clearMessages();

    return this.http.post<Token>(AuthUrls.login, { email, password }).pipe(
      tap((response) => {
        // console.debug('Login response:', response);
        this.setSession(response);
      }),
      catchError((error) => {
        console.error('Login error:', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Login error: ${error.error[key]}`,
            dismissible: true,
          });
        });
        return of(null);
      }),
    );
  }

  resend(email: string): Observable<null> {
    this.messageService.clearMessages();
    return this.http.post<null>(AuthUrls.resend, { email }).pipe(
      tap((response: null) => {
        console.debug('Resend verification response:', response);
      }),
      catchError((error) => {
        console.error('Resend verification error:', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Resend verification error (${key}): ${error.error[key]}`,
            dismissible: true,
          });
        });
        return of(null);
      }),
    );
  }

  verify(key: string): Observable<Token | null> {
    this.messageService.clearMessages();
    return this.http.post<Token>(AuthUrls.verify, { key }).pipe(
      tap((response: Token) => this.setSession(response)),
      catchError((error) => {
        console.error('Registration error: ', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Registration error (${key}): ${error.error[key]}`,
            dismissible: true,
          });
        });
        return of(null);
      }),
    );
  }

  register(email: string, password: string): Observable<Token | null> {
    this.messageService.clearMessages();
    const username = 'User' + Math.floor(Math.random() * 1000000);
    const password1 = password;
    const password2 = password;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.http.post<any>(AuthUrls.register, { username, email, password1, password2 }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tap((response: any) => this.setSession(response)),
      catchError((error) => {
        console.error('Registration error: ', error);
        Object.keys(error.error).forEach((key) => {
          this.messageService.addMessage({
            type: 'error',
            text: `Registration error (${key}): ${error.error[key]}`,
            dismissible: true,
          });
        });
        // this.errors.push('Registration error: ' + JSON.stringify(error.error, null, 2));
        return of(null);
      }),
    );
  }

  refreshToken(): Observable<Token | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken || this.isRefreshTokenExpired()) {
      this.logout();
      return of(null);
    }
    return this.http.post<Token>(AuthUrls.refreshToken, { refresh: refreshToken }).pipe(
      tap((response) => this.updateSession(response)),
      catchError((error) => {
        console.debug('Logging out, due to error refreshing token:', error);
        this.logout();
        return of(null);
      }),
    );
  }

  private setSession(authResult: Token) {
    const accessToken = authResult.access;
    const refreshToken = authResult.refresh;

    const decodedAccessToken: JWT | null = decodeJWT(accessToken);
    if (decodedAccessToken === null || decodedAccessToken.exp === undefined) {
      console.error('Failed to decode access token');
      return;
    }
    const accessExpiresAt = decodedAccessToken.exp * 1000;

    const decodedRefreshToken: JWT | null = decodeJWT(refreshToken);
    if (decodedRefreshToken === null || decodedRefreshToken.exp === undefined) {
      console.error('Failed to decode refresh token');
      return;
    }
    const refreshExpiresAt = decodedRefreshToken.exp * 1000;

    localStorage.setItem('id_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('expires_at', JSON.stringify(accessExpiresAt));
    localStorage.setItem('refresh_expires_at', JSON.stringify(refreshExpiresAt));

    this.loggedInSignal.set(!this.isRefreshTokenExpired());
    this.tokenSubject.next(accessToken);
  }

  private updateSession(authResult: Token) {
    const accessToken = authResult.access;
    const decodedAccessToken: JWT | null = decodeJWT(accessToken);
    if (decodedAccessToken === null || decodedAccessToken.exp === undefined) {
      console.error('Failed to decode access token');
      return;
    }
    const accessExpiresAt = decodedAccessToken.exp * 1000;

    localStorage.setItem('id_token', accessToken);
    localStorage.setItem('expires_at', JSON.stringify(accessExpiresAt));

    this.loggedInSignal.set(!this.isRefreshTokenExpired());
    this.tokenSubject.next(accessToken);
  }

  logout() {
    localStorage.removeItem('id_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('expires_at');
    localStorage.removeItem('refresh_expires_at');
    this.loggedInSignal.set(false);
    this.tokenSubject.next(null);
  }

  get isLoggedIn(): WritableSignal<boolean> {
    return this.loggedInSignal;
  }

  public getToken(): string | null {
    return localStorage.getItem('id_token');
  }

  public getTokenObservable(): Observable<string | null> {
    const token = this.getToken();
    if (this.isRefreshTokenExpired()) {
      this.logout();
      return of(null);
    } else if (token && !this.isTokenExpired()) {
      return of(token);
    }
    return this.refreshToken().pipe(switchMap(() => of(this.getToken())));
  }

  private isTokenExpired(): boolean {
    const expiration = localStorage.getItem('expires_at');
    return expiration === null || expiration === undefined || new Date().getTime() >= JSON.parse(expiration);
  }

  public isRefreshTokenExpired(): boolean {
    const refreshExpiration = localStorage.getItem('refresh_expires_at');
    return (
      refreshExpiration === null ||
      refreshExpiration === undefined ||
      new Date().getTime() >= JSON.parse(refreshExpiration)
    );
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }
}
