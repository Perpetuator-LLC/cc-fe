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
import { AsyncPipe, DecimalPipe, NgClass } from '@angular/common';
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
import { CreditService } from '../credit.service';
import { Job, JobService, JobStatus } from '../job.service';
import { toObservable } from '@angular/core/rxjs-interop';

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
    DecimalPipe,
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
  protected userCredits = 0;
  protected jobs: Job[] = [];

  @ViewChild('toolbarContainer', { read: ViewContainerRef, static: true }) toolbarContainer!: ViewContainerRef;

  constructor(
    protected themeService: ThemeService,
    protected authService: AuthService,
    private toolbarService: ToolbarService,
    private router: Router,
    protected userService: UserService,
    private renderer: Renderer2,
    private creditService: CreditService,
    private jobService: JobService,
  ) {
    toObservable(this.creditService.userCredits).subscribe((credits) => {
      this.userCredits = credits;
    });
    toObservable(this.jobService.jobs).subscribe((jobs) => {
      const completed = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED);
      if (completed.length > 0) {
        this.creditService.refetchUserCredits();
      }
    });
  }

  ngOnInit() {
    this.toolbarService.setRootViewContainerRef(this.toolbarContainer);
    if (this.isLoggedIn()) {
      this.userService.loadUserDetails();
    }
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
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
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
    this.userService.clearUserDetails();
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

  handleClick(event: MouseEvent, path: string | undefined): void {
    if (event.button === 0 && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.router.navigate([path]);
    }
  }

  shortCredits(value: number): string {
    const absValue = Math.abs(value);
    if (isNaN(absValue)) return `${value}`;

    const units = ['k', 'M', 'B'];
    let unitIndex = -1;
    let displayValue = absValue;

    while (displayValue >= 1000 && unitIndex < units.length - 1) {
      displayValue /= 1000;
      unitIndex++;
    }

    const digitsToShow = 3;
    const digits = displayValue.toFixed(digitsToShow - Math.floor(displayValue).toString().length);
    return unitIndex === -1 ? `${value.toFixed(0)}` : `${digits}${units[unitIndex]}`;
  }
}
