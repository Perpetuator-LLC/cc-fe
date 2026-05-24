// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, inject, OnInit, ViewChild, ElementRef, Renderer2, HostListener, computed } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DecimalPipe, NgClass } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDivider } from '@angular/material/divider';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Route, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { routes } from '../../app.routes';
import { Theme, ThemeService } from '../theme.service';
import { AuthService } from '../../auth/auth.service';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { PageTitleService } from '../page-title.service';
import { AuthGuard } from '../../auth/auth.guard';
import { UserService } from '../../user/user.service';
import { MatTooltip } from '@angular/material/tooltip';
import { CreditService } from '../../credits/credit.service';
import { Job, JobService, JobStatus } from '../../jobs/job.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { MessageService } from '../../message.service';
import { MatDialog } from '@angular/material/dialog';
import { RedeemGiftCodeDialogComponent } from '../../credits/redeem-gift-code-dialog/redeem-gift-code-dialog.component';
import { SharedFooterComponent } from '../shared-footer/shared-footer.component';
import { JobStatusIndicatorComponent } from '../../jobs/job-status-indicator/job-status-indicator.component';
import { LoadingService } from '../loading.service';
import { MediaTabPreferenceService } from '../media-tab-preference.service';
import { AudioPlayerBarComponent } from '../../shared/audio-player/audio-player-bar.component';
import { TerminalRoutingService } from '../../terminal/terminal-routing.service';
import { StartsWithPipe } from '../../shared/pipes';

@Component({
  selector: 'app-post-login-layout',
  templateUrl: './post-login-layout.component.html',
  styleUrls: ['./post-login-layout.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatSidenavModule,
    MatToolbarModule,
    MatProgressBarModule,
    MatDivider,
    RouterLink,
    RouterLinkActive,
    MatTooltip,
    NgClass,
    DecimalPipe,
    SharedFooterComponent,
    JobStatusIndicatorComponent,
    AudioPlayerBarComponent,
    StartsWithPipe,
  ],
})
export class PostLoginLayoutComponent implements OnInit {
  protected themeService = inject(ThemeService);
  protected authService = inject(AuthService);
  protected pageTitleService = inject(PageTitleService);
  protected router = inject(Router);
  protected userService = inject(UserService);
  private renderer = inject(Renderer2);
  private creditService = inject(CreditService);
  private jobService = inject(JobService);
  private messageService = inject(MessageService);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private loadingService = inject(LoadingService);
  private mediaTabPreferenceService = inject(MediaTabPreferenceService);
  protected terminalRoutingService = inject(TerminalRoutingService);

  @ViewChild('drawer') drawer!: MatSidenav;
  protected loading = this.loadingService.loading;
  rootRoutes = routes.filter((r) => r.path && r.data?.['icon'] && !r.redirectTo);
  /** Pre-filtered rootRoutes via shouldShow — computed signal so the template just iterates. */
  readonly visibleRootRoutes = computed(() => {
    // Touch isLoggedIn so the signal re-runs when login state changes.
    void this.authService.isLoggedIn();
    return this.rootRoutes.filter((r) => this.shouldShow(r));
  });
  private breakpointObserver = inject(BreakpointObserver);
  protected currentTheme = this.themeService.theme;
  protected isLoggedIn = this.authService.isLoggedIn;
  protected user = this.userService.userDetails;
  private authRequiredRoutes = AuthGuard.getAuthRequiredRoutes();
  private loggedOutRoutes = AuthGuard.getLoggedOutRoutes();
  private isMinimized = false;
  protected userCredits = 0;
  /** Pre-formatted short credits string used in the chip. */
  protected userCreditsShort = '0';
  userDetailForm: FormGroup;
  protected jobs: Job[] = [];
  itemTitle = '';
  protected isSecondSidebarVisible = true;
  isHomePage = false;
  showSecondSidebar = false;
  showMobileSidebar = false;

  // Page title from the new signal-based service
  protected pageTitle = this.pageTitleService.title;
  protected pageIcon = this.pageTitleService.icon;
  protected pageBreadcrumb = this.pageTitleService.breadcrumb;

  @ViewChild('afterHeader', { static: false, read: ElementRef }) afterHeaderRef!: ElementRef;

  constructor() {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '' }],
    });

    toObservable(this.creditService.userCredits).subscribe({
      next: (credits) => {
        this.userCredits = credits;
        this.userCreditsShort = this.shortCredits(credits);
      },
      error: (error) => {
        this.messageService.error(`Failed to load credits signal: ${error.message}`);
      },
    });
    toObservable(this.jobService.jobs).subscribe({
      next: (jobs) => {
        const completed = this.jobService.getJobTransitions(jobs, this.jobs, JobStatus.COMPLETED);
        // Filter out FETCH_NEWS and EXTRACT_NEWS jobs as they cost 0 and won't update credits...
        const filtered = completed.filter((job) => job.kind !== 'FETCH_NEWS' && job.kind !== 'EXTRACT_NEWS');
        if (filtered.length > 0) {
          this.creditService.refetchUserCredits();
        }
        this.jobs = jobs;
      },
      error: (error) => {
        this.messageService.error(`Failed to load jobs signal: ${error.message}`);
      },
    });
    this.router.events.subscribe(() => {
      const url = this.router.url;
      this.isHomePage = url === '/' || url === '/home';
      this.showSecondSidebar = url.startsWith('/media/') || url.startsWith('/terminal') || url.startsWith('/jobs');
      // Track media tab preference when user navigates
      if (url.startsWith('/media/')) {
        this.mediaTabPreferenceService.recordTabVisit(url);
      }
    });
  }

  ngOnInit() {
    this.currentTheme = this.themeService.theme;
    if (this.isLoggedIn()) {
      this.userService.loadUserDetails();
    }
  }

  // ngAfterViewInit() {
  //   // const resizeObserver = new ResizeObserver(() => {
  //   //   const toolbarHeight = this.toolbar.nativeElement.offsetHeight;
  //   //   const fillSideElement = document.querySelector('.fill-side');
  //   //   if (fillSideElement) {
  //   //     this.renderer.setStyle(fillSideElement, 'height', `calc(100vh - ${toolbarHeight}px - 16px)`);
  //   //   }
  //   // });
  //   //
  //   // resizeObserver.observe(this.toolbar.nativeElement);
  // }

  getTitlePath(item: string) {
    this.itemTitle = item;
    // console.log('item', item);
  }

  toggleMinimized() {
    this.isMinimized = !this.isMinimized;
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 0);
  }

  shouldShow(item: Route): boolean {
    // Check for explicit showInMenu property - this takes priority
    if (item.data && item.data['showInMenu'] !== undefined) {
      if (!item.data['showInMenu']) {
        return false;
      }
      // If showInMenu is true, show for logged-in users (or check loggedOutRoutes for logged-out users)
      if (this.isLoggedIn()) {
        // For logged-in users, show any route with showInMenu: true
        // (except those explicitly in loggedOutRoutes like login/register)
        if (item.path && this.loggedOutRoutes.includes(item.path)) {
          return false; // Don't show login/register to logged-in users
        }
        return true;
      } else {
        // For logged-out users, only show loggedOutRoutes
        return item.path ? this.loggedOutRoutes.includes(item.path) : false;
      }
    } else {
      // Legacy behavior: if no showInMenu property, check for icon (but this is being phased out)
      // Routes without showInMenu and without icon should be hidden
      if (!item.data || !item.data['icon']) {
        return false;
      }
    }

    // First check if the route should be hidden from main sidebar
    if (item.path && ['news', 'e'].includes(item.path)) {
      return false;
    }

    // Routes visible to all users (logged in or out)
    if (item.path && ['privacy-policy', 'terms-and-conditions'].includes(item.path)) {
      return true;
    }

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
    // Only use the theme service - don't maintain a separate signal
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

  toggleSecondSidebar() {
    this.isSecondSidebarVisible = !this.isSecondSidebarVisible;
  }

  openRedeemGiftCodeDialog() {
    const userPermissions = this.userService.userDetails()?.permissions || [];
    const hasAdminPermissions = userPermissions.includes('api.add_bonuscode');

    this.dialog.open(RedeemGiftCodeDialogComponent, {
      width: hasAdminPermissions ? '800px' : '500px',
      maxWidth: hasAdminPermissions ? '90vw' : '500px',
      maxHeight: hasAdminPermissions ? '90vh' : undefined,
      data: {
        email: this.userDetailForm.get('email')?.value,
        permissions: userPermissions,
      },
    });
  }

  onHamburgerClick(event: Event) {
    event.stopPropagation();
    this.showMobileSidebar = !this.showMobileSidebar;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.showMobileSidebar) {
      const headerEl = this.afterHeaderRef?.nativeElement;
      if (headerEl && !headerEl.contains(event.target)) {
        this.showMobileSidebar = false;
      }
    }
  }
}
