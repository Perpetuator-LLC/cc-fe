import {
  Component,
  inject,
  OnInit,
  ViewChild,
  OnDestroy,
  ViewContainerRef,
  AfterViewInit,
  ElementRef,
  Renderer2,
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { AsyncPipe, NgClass } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Route, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { routes } from '../app.routes';
import { Theme, ThemeService } from '../theme.service';
import { AuthService } from '../auth.service';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { FormsModule } from '@angular/forms';
import { CookieBannerComponent } from '../cookie-banner/cookie-banner.component';
import { ToolbarService } from '../toolbar.service';
import { AuthGuard } from '../auth.guard';
import { UserService } from '../user.service';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    AsyncPipe,
    CookieBannerComponent,
    FormsModule,
    MatButtonModule,
    MatButtonToggle,
    MatButtonToggleGroup,
    MatIconModule,
    MatListModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    MatTooltip,
    NgClass,
  ],
})
export class LayoutComponent implements OnDestroy, OnInit, AfterViewInit {
  @ViewChild('toolbar', { read: ElementRef }) toolbar!: ElementRef;
  @ViewChild('drawer') drawer!: MatSidenav;
  rootRoutes = routes.filter((r) => r.path);
  private breakpointObserver = inject(BreakpointObserver);
  protected currentTheme = this.themeService.theme;
  protected isLoggedIn = this.authService.isLoggedIn;
  protected user = this.userService.userDetails;
  private authRequiredRoutes = AuthGuard.getAuthRequiredRoutes();
  private loggedOutRoutes = AuthGuard.getLoggedOutRoutes();
  private isMinimized = false;

  @ViewChild('toolbarContainer', { read: ViewContainerRef, static: true }) toolbarContainer!: ViewContainerRef;

  constructor(
    protected themeService: ThemeService,
    protected authService: AuthService,
    private toolbarService: ToolbarService,
    private router: Router,
    protected userService: UserService,
    private renderer: Renderer2,
    // private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.toolbarService.setRootViewContainerRef(this.toolbarContainer);
    this.userService.loadUserDetails((userDetails: { username: string; email: string }) => {
      console.debug('User details loaded:', userDetails);
    });
  }

  ngOnDestroy() {
    this.toolbarService.clearToolbarComponent();
  }

  ngAfterViewInit() {
    const resizeObserver = new ResizeObserver(() => {
      const toolbarHeight = this.toolbar.nativeElement.offsetHeight;
      const fillSideElement = document.querySelector('.fill-side');
      if (fillSideElement) {
        this.renderer.setStyle(fillSideElement, 'height', `calc(100vh - ${toolbarHeight}px - 16px)`);
      }
    });

    resizeObserver.observe(this.toolbar.nativeElement);
  }

  toggleMinimized() {
    this.isMinimized = !this.isMinimized;
    // this.renderer.?
    // this.cdr.detectChanges(); // Force change detection
    setTimeout(() => {
      window.dispatchEvent(new Event('resize')); // Trigger a resize event
    }, 0);
  }

  shouldShow(item: Route): boolean {
    if (item.path && this.loggedOutRoutes.includes(item.path)) {
      return !this.isLoggedIn();
    } else if (item.path && this.authRequiredRoutes.includes(item.path)) {
      return this.isLoggedIn();
    }
    return false; // default: hide all other routes
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset).pipe(
    map((result) => result.matches),
    shareReplay(),
  );

  get minimized(): boolean {
    return this.drawer?.mode === 'side' ? this.isMinimized : false;
  }

  get drawerOpened(): boolean {
    return this.drawer && this.drawer.opened;
  }

  switchTheme(theme: Theme): void {
    this.themeService.setTheme(theme);
  }
}
