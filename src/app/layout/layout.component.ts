// Copyright (c) 2025 Perpetuator LLC
import {
  Component,
  inject,
  OnInit,
  ViewChild,
  OnDestroy,
  ViewContainerRef,
  ElementRef,
  Renderer2,
  HostListener,
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { DecimalPipe, NgClass } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Route, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { routes } from '../app.routes';
import { Theme, ThemeService } from '../theme.service';
import { AuthService } from '../auth.service';
import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { ToolbarService } from '../toolbar.service';
import { AuthGuard } from '../auth.guard';
import { UserService } from '../user.service';
import { MatTooltip } from '@angular/material/tooltip';
import { CreditService } from '../credit.service';
import { Job, JobService, JobStatus } from '../job.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { MessageService } from '../message.service';
import { SvgIconComponent } from '../svg-icon/svg-icon.component';
import { MatDialog } from '@angular/material/dialog';
import { TermsAndConditionsModalComponent } from '../terms-and-conditions-modal.component';
import { PrivacyPolicyModalComponent } from '../privacy-policy-modal.component';
import { RedeemGiftCodeDialogComponent } from '../redeem-gift-code-dialog.component';
import { SharedFooterComponent } from '../shared-footer/shared-footer.component';

@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  standalone: true,
  imports: [
    SvgIconComponent,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    MatTooltip,
    NgClass,
    DecimalPipe,
    SharedFooterComponent,
  ],
})
export class LayoutComponent implements OnDestroy, OnInit {
  // @ViewChild('toolbar', { read: ElementRef }) toolbar!: ElementRef;
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
  userDetailForm: FormGroup;
  protected jobs: Job[] = [];
  itemTitle = '';
  protected isSecondSidebarVisible = true;
  isHomePage = false;
  showSecondSidebar = false;
  showMobileSidebar = false;

  @ViewChild('toolbarContainer', { read: ViewContainerRef, static: true }) toolbarContainer!: ViewContainerRef;
  @ViewChild('afterHeader', { static: false, read: ElementRef }) afterHeaderRef!: ElementRef;

  constructor(
    protected themeService: ThemeService,
    protected authService: AuthService,
    private toolbarService: ToolbarService,
    private router: Router,
    protected userService: UserService,
    private renderer: Renderer2,
    private creditService: CreditService,
    private jobService: JobService,
    private messageService: MessageService,
    private dialog: MatDialog,
    private fb: FormBuilder,
  ) {
    this.userDetailForm = this.fb.group({
      username: ['', Validators.required],
      email: [{ value: '' }],
    });

    toObservable(this.creditService.userCredits).subscribe({
      next: (credits) => {
        this.userCredits = credits;
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
      this.showSecondSidebar =
        url.startsWith('/podcasts') ||
        url.startsWith('/podcast/') ||
        url.startsWith('/news') ||
        url.startsWith('/episodes') ||
        url.startsWith('/episode/');
    });
  }

  ngOnInit() {
    console.log('rootRoutes', this.rootRoutes);
    this.toolbarService.setRootViewContainerRef(this.toolbarContainer);
    this.currentTheme = this.themeService.theme;
    if (this.isLoggedIn()) {
      this.userService.loadUserDetails();
    }
  }

  ngOnDestroy() {
    this.toolbarService.clearToolbarComponent();
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
    // First check if the route should be hidden from main sidebar
    if (item.path && ['news', 'episodes'].includes(item.path)) {
      return false;
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
    this.currentTheme.set(theme);
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

  openTermsModal(event: Event) {
    event.preventDefault();
    this.dialog.open(TermsAndConditionsModalComponent, {
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'privacy-policy-modal',
    });
  }

  openPrivacyModal(event: Event) {
    event.preventDefault();
    this.dialog.open(PrivacyPolicyModalComponent, {
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'privacy-policy-modal',
    });
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

  onHamburgerClick(event: MouseEvent) {
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
