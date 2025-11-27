// Copyright (c) 2025 Perpetuator LLC
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { LayoutComponent } from './layout.component';
import { RouterTestingModule } from '@angular/router/testing';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { AuthService } from '../auth.service';
import { ThemeService } from '../theme.service';
import { ToolbarService } from '../toolbar.service';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Apollo } from 'apollo-angular';

describe('LayoutComponent', () => {
  let fixture: ComponentFixture<LayoutComponent>;
  let component: LayoutComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let themeService: jasmine.SpyObj<ThemeService>;
  let toolbarService: jasmine.SpyObj<ToolbarService>;
  let breakpointObserver: jasmine.SpyObj<BreakpointObserver>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj('AuthService', ['isLoggedIn', 'logout']);
    themeService = jasmine.createSpyObj('ThemeService', ['setTheme'], { currentTheme: 'light' });
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
        { provide: AuthService, useValue: authService },
        { provide: ThemeService, useValue: themeService },
        { provide: ToolbarService, useValue: toolbarService },
        { provide: BreakpointObserver, useValue: breakpointObserver },
        { provide: Apollo, useValue: mockApollo },
      ],
      // schemas: [NO_ERRORS_SCHEMA], // To ignore child components like router-outlet
    }).compileComponents();

    fixture = TestBed.createComponent(LayoutComponent);
    component = fixture.componentInstance;
  });

  it('should create the layout component', () => {
    expect(component).toBeTruthy();
  });

  it('should render home link when logged out', () => {
    authService.isLoggedIn.and.returnValue(false);
    fixture.detectChanges();
    const homeLink = fixture.debugElement
      .queryAll(By.css('a[mat-list-item]'))
      .find((el) => el.nativeElement.textContent.trim() === 'Home');
    expect(homeLink).not.toBeNull();
    expect(homeLink?.nativeElement.textContent).toContain('Home');
  });

  it('should render login link when not logged in', () => {
    authService.isLoggedIn.and.returnValue(false);
    fixture.detectChanges();
    const loginLink = fixture.debugElement
      .queryAll(By.css('a[mat-list-item]'))
      .find((el) => el.nativeElement.textContent.trim() === 'Login');
    expect(loginLink).not.toBeNull();
    expect(loginLink?.nativeElement.textContent).toContain('Login');
  });

  it('should render logout button when logged in', () => {
    authService.isLoggedIn.and.returnValue(true);
    fixture.detectChanges();
    const logoutButton = fixture.debugElement
      .queryAll(By.css('a[mat-list-item]'))
      .find((el) => el.nativeElement.textContent.trim() === 'Logout');
    expect(logoutButton).not.toBeNull();
    expect(logoutButton?.nativeElement.textContent).toContain('Logout');
  });

  it('should call logout method when logout button is clicked', () => {
    authService.isLoggedIn.and.returnValue(true);
    fixture.detectChanges();
    const logoutButton = fixture.debugElement
      .queryAll(By.css('a[mat-list-item]'))
      .find((el) => el.nativeElement.textContent.trim() === 'Logout');
    expect(logoutButton).not.toBeNull();
    logoutButton?.triggerEventHandler('click', { button: 0 });
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should switch themes', () => {
    component.switchTheme('dark');
    expect(themeService.setTheme).toHaveBeenCalledWith('dark');
    expect(component['currentTheme']).toBe('dark');
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

  it('should initialize the toolbar container', () => {
    fixture.detectChanges();
    expect(toolbarService.setRootViewContainerRef).toHaveBeenCalledWith(component.toolbarContainer);
  });

  it('should clear the toolbar on destroy', () => {
    component.ngOnDestroy();
    expect(toolbarService.clearToolbarComponent).toHaveBeenCalled();
  });
});
