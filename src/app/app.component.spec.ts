// Copyright (c) 2025 Perpetuator LLC
import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AuthService } from './auth/auth.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { OAuthService } from 'angular-oauth2-oidc';
import { of } from 'rxjs';
import { ApolloTestingModule } from 'apollo-angular/testing';

describe('AppComponent', () => {
  beforeEach(async () => {
    const mockOAuthService = jasmine.createSpyObj('OAuthService', [
      'configure',
      'loadDiscoveryDocumentAndTryLogin',
      'hasValidAccessToken',
      'getAccessToken',
      'refreshToken',
      'logOut',
      'initCodeFlow',
    ]);
    mockOAuthService.hasValidAccessToken.and.returnValue(false);
    mockOAuthService.getAccessToken.and.returnValue('');
    mockOAuthService.loadDiscoveryDocumentAndTryLogin.and.returnValue(Promise.resolve());
    mockOAuthService.events = of({});

    await TestBed.configureTestingModule({
      imports: [AppComponent, HttpClientTestingModule, NoopAnimationsModule, ApolloTestingModule],
      providers: [AuthService, { provide: OAuthService, useValue: mockOAuthService }],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have the title 'Capital Copilot'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('Capital Copilot');
  });
});
