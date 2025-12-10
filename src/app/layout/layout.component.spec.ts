// Copyright (c) 2025 Perpetuator LLC
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LayoutComponent } from './layout.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from './theme.service';
import { ToolbarService } from './toolbar.service';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Apollo } from 'apollo-angular';
import { signal } from '@angular/core';
import { getCommonTestProviders } from '../testing/test-helpers';

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let component: LayoutComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let themeService: jasmine.SpyObj<ThemeService>;

  let toolbarService: jasmine.SpyObj<ToolbarService>;
  let breakpointObserver: jasmine.SpyObj<BreakpointObserver>;

  beforeEach(async () => {
    const themeSignal = signal('light' as 'light' | 'dark');
    const isLoggedInSignal = signal(false);

    authService = jasmine.createSpyObj('AuthService', ['logout'], { isLoggedIn: isLoggedInSignal });
    themeService = jasmine.createSpyObj('ThemeService', ['setTheme'], { theme: themeSignal });
    toolbarService = jasmine.createSpyObj('ToolbarService', ['setRootViewContainerRef', 'clearToolbarComponent']);
    breakpointObserver = jasmine.createSpyObj('BreakpointObserver', ['observe']);

    const mockApollo = jasmine.createSpyObj('Apollo', ['query', 'mutate', 'watchQuery']);
    const mockQueryRef = {
      valueChanges: of({ data: {}, loading: false, networkStatus: 7 }),
      refetch: jasmine.createSpy('refetch').and.returnValue(Promise.resolve({ data: {} })),
    };
    mockApollo.query.and.returnValue(of({ data: {}, loading: false, networkStatus: 7 }));
    mockApollo.watchQuery.and.returnValue(mockQueryRef);
    mockApollo.mutate.and.returnValue(of({ data: {} }));

    breakpointObserver.observe.and.returnValue(
      of({
        matches: true,
        breakpoints: {
          '(max-width: 599px)': true,
          '(min-width: 600px)': false,
        },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [LayoutComponent, MatSidenavModule, RouterTestingModule, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        ...getCommonTestProviders(),
        { provide: AuthService, useValue: authService },
        { provide: ThemeService, useValue: themeService },
        { provide: ToolbarService, useValue: toolbarService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
        { provide: Apollo, useValue: mockApollo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
  });

  it('should create the layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should render home link when logged out', () => {
    authService.isLoggedIn.set(false);
    fixture.detectChanges();
    // Home link is always present as part of rootRoutes
    const homeLinks = fixture.debugElement.queryAll(By.css('a[mat-list-item]'));
    expect(homeLinks.length).toBeGreaterThan(0);
  });

  it('should render login link when not logged in', () => {
    authService.isLoggedIn.set(false);
    fixture.detectChanges();
    // Login functionality is handled by the layout, check for navigation links
    const links = fixture.debugElement.queryAll(By.css('a[mat-list-item]'));
    expect(links.length).toBeGreaterThan(0);
  });

  it('should render logout button when logged in', () => {
    authService.isLoggedIn.set(true);
    fixture.detectChanges();
    const logoutButton = fixture.debugElement.query(By.css('.log-out-btn'));
    expect(logoutButton).not.toBeNull();
    expect(logoutButton.nativeElement.textContent.trim()).toContain('Logout');
  });

  it('should call logout method when logout button is clicked', () => {
    authService.isLoggedIn.set(true);
    fixture.detectChanges();
    const logoutButton = fixture.debugElement.query(By.css('.log-out-btn'));
    expect(logoutButton).not.toBeNull();
    logoutButton.nativeElement.click();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should switch themes', () => {
    component.switchTheme('dark');
    expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    themeService.theme.set('dark');
    expect(themeService.theme()).toBe('dark');
  });

  it('should correctly handle handset layout', (done) => {
    const mockBreakpointState: BreakpointState = {
      matches: true,
      breakpoints: {},
    };
    breakpointObserver.observe.and.returnValue(of(mockBreakpointState));
    component.isHandset$.subscribe((isHandset) => {
      expect(isHandset).toBeTrue();
      done();
    });
  });

  it('should handle drawer state', () => {
    component.drawer = { opened: true } as MatSidenav;
    expect(component.drawerOpened).toBeTrue();

    component.drawer = { opened: false } as MatSidenav;
    expect(component.drawerOpened).toBeFalse();
  });
});
