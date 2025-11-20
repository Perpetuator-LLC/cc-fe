// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../auth.service';
import { LoginComponent } from './login.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { createTestJWT } from '../jwt';
import { ToolbarService } from '../toolbar.service';
import { ThemeService } from '../theme.service';
import { MessageService } from '../message.service';
import { CookieConsentService } from '../cookie-consent.service';
import { UserService } from '../user.service';
import { MatDialog } from '@angular/material/dialog';
import { AffiliateService } from '../affiliate.service';
import { AffiliateStorageService } from '../affiliate-storage.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;
  let mockToolbarService: jasmine.SpyObj<ToolbarService>;
  let mockThemeService: jasmine.SpyObj<ThemeService>;
  let mockMessageService: jasmine.SpyObj<MessageService>;
  let mockCookieConsentService: jasmine.SpyObj<CookieConsentService>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;
  let mockAffiliateService: jasmine.SpyObj<AffiliateService>;
  let mockAffiliateStorageService: jasmine.SpyObj<AffiliateStorageService>;

  beforeEach(async () => {
    mockToolbarService = jasmine.createSpyObj('ToolbarService', ['getViewContainerRef', 'clearToolbarComponent']);
    const mockViewContainerRef = jasmine.createSpyObj('ViewContainerRef', ['clear', 'createEmbeddedView']);
    mockToolbarService.getViewContainerRef.and.returnValue(mockViewContainerRef);

    mockThemeService = jasmine.createSpyObj('ThemeService', ['applyTheme', 'getCurrentTheme', 'loadTheme']);
    mockMessageService = jasmine.createSpyObj('MessageService', ['success', 'error', 'clearMessages', 'addMessage']);
    Object.defineProperty(mockMessageService, 'messageCount', {
      get: () => 0,
      configurable: true,
    });
    mockCookieConsentService = jasmine.createSpyObj('CookieConsentService', ['hasConsented']);
    mockUserService = jasmine.createSpyObj('UserService', ['getUser', 'loadUserDetails']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    mockAffiliateService = jasmine.createSpyObj('AffiliateService', ['getAffiliateByCode']);
    mockAffiliateStorageService = jasmine.createSpyObj('AffiliateStorageService', [
      'getCode',
      'clearCode',
      'getAffiliateCode',
      'setAffiliateCode',
    ]);
    mockAffiliateStorageService.getAffiliateCode.and.returnValue(null);

    const authServiceSpy = jasmine.createSpyObj('AuthService', ['login', 'getErrors']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    const mockActivatedRoute = { snapshot: { queryParams: of({}) } };

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ToolbarService, useValue: mockToolbarService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: CookieConsentService, useValue: mockCookieConsentService },
        { provide: UserService, useValue: mockUserService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: AffiliateService, useValue: mockAffiliateService },
        { provide: AffiliateStorageService, useValue: mockAffiliateStorageService },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // it('should set up the toolbar with the toolbar template', () => {
  //   fixture.detectChanges();
  //   expect(mockToolbarService.getViewContainerRef).toHaveBeenCalled();
  //   expect(mockToolbarService.getViewContainerRef().clear).toHaveBeenCalled();
  //   expect(mockToolbarService.getViewContainerRef().createEmbeddedView)
  //      .toHaveBeenCalledWith(component.toolbarTemplate);
  // });

  it('should call AuthService login on form submit', (done) => {
    authService.login.and.returnValue(
      of({
        access: createTestJWT({}),
        refresh: createTestJWT({}, 3600 * 24),
      }),
    );
    component.loginForm.setValue({ email: 'test@example.com', password: 'testpassword' });
    component.onSubmit();

    expect(authService.login).toHaveBeenCalledWith('test@example.com', 'testpassword');

    // Wait for async subscription to complete
    setTimeout(() => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
      done();
    }, 100);
  });

  it('should display validation errors when form is invalid', () => {
    component.loginForm.setValue({ email: '', password: '' });

    const usernameControl = component.loginForm.controls['email'];
    const passwordControl = component.loginForm.controls['password'];

    expect(usernameControl.valid).toBeFalse();
    expect(passwordControl.valid).toBeFalse();

    expect(usernameControl.errors).toEqual({ required: true });
    expect(passwordControl.errors).toEqual({ required: true });
  });

  it('should be valid when form is filled correctly', () => {
    component.loginForm.setValue({ email: 'test@example.com', password: 'testpassword' });

    expect(component.loginForm.valid).toBeTrue();
  });
});
