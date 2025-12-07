// Copyright (c) 2025 Perpetuator LLC
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { LoginComponent } from './login.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToolbarService } from '../../toolbar.service';
import { ThemeService } from '../../theme.service';
import { MessageService } from '../../message.service';
import { UserService } from '../../user.service';
import { MatDialog } from '@angular/material/dialog';
import { AffiliateService } from '../../affiliate/affiliate.service';
import { AffiliateStorageService } from '../../affiliate/affiliate-storage.service';
import { GraphqlAuthService } from '../graphql-auth.service';
import { PolicyGuardService } from '../../policy/services/policy-guard.service';
import { CookieConsentService } from '../../policy/services/cookie-consent.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let graphqlAuthService: jasmine.SpyObj<GraphqlAuthService>;
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
      'getReturnUrl',
      'setReturnUrl',
      'clearReturnUrl',
    ]);
    mockAffiliateStorageService.getAffiliateCode.and.returnValue(null);
    mockAffiliateStorageService.getReturnUrl.and.returnValue(null);

    const graphqlAuthServiceSpy = jasmine.createSpyObj('GraphqlAuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);
    const mockActivatedRoute = { snapshot: { queryParams: of({}) } };
    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
    const mockPolicyGuardService = jasmine.createSpyObj('PolicyGuardService', [
      'checkPolicyAcceptance',
      'checkPoliciesNow',
    ]);
    mockPolicyGuardService.checkPolicyAcceptance.and.returnValue(of(true));
    mockPolicyGuardService.checkPoliciesNow.and.returnValue(of(true)); // Returns Observable not Promise

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, LoginComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: GraphqlAuthService, useValue: graphqlAuthServiceSpy },
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
        { provide: Apollo, useValue: mockApollo },
        { provide: PolicyGuardService, useValue: mockPolicyGuardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    graphqlAuthService = TestBed.inject(GraphqlAuthService) as jasmine.SpyObj<GraphqlAuthService>;
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

  it('should call GraphqlAuthService login on form submit', (done) => {
    graphqlAuthService.login.and.returnValue(of(true));
    component.loginForm.setValue({ email: 'test@example.com', password: 'testpassword' });
    component.onSubmit();

    expect(graphqlAuthService.login).toHaveBeenCalledWith('test@example.com', 'testpassword');

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
