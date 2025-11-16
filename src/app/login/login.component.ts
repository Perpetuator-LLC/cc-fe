// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { environment } from '../../environments/environment';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { ThemeService } from '../theme.service';
import { CookieConsentService } from '../cookie-consent.service';
import { Subscription } from 'rxjs';
import { UserService } from '../user.service';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AffiliateService } from '../affiliate.service';
import { AffiliateStorageService } from '../affiliate-storage.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatFormField,
    MatInput,
    MatButton,
    MatLabel,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatCardContent,
    MatCardActions,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    RouterLink,
    MessageComponent,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private subscription: Subscription | undefined;
  private affiliateCode: string | null = null;

  loginForm = new FormGroup({
    // TODO: Add validation equivalent to back-end
    password: new FormControl(environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(5)]),
    email: new FormControl(environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]),
  });
  returnUrl = '';
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private themeService: ThemeService,
    private userService: UserService,
    private cookieConsentService: CookieConsentService,
    private dialog: MatDialog,
    private affiliateService: AffiliateService,
    private affiliateStorageService: AffiliateStorageService,
  ) {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';

    const refCode = this.route.snapshot.queryParams['ref'];
    if (refCode) {
      this.affiliateCode = refCode;
      this.affiliateStorageService.setAffiliateCode(refCode);
    } else {
      this.affiliateCode = this.affiliateStorageService.getAffiliateCode();
    }
  }

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
  }

  onSubmit() {
    this.messageService.clearMessages();
    this.subscription = this.authService
      .login(this.loginForm.value.email as string, this.loginForm.value.password as string)
      .subscribe({
        next: () => {
          if (this.messageService.messageCount === 0) {
            if (this.affiliateCode) {
              this.joinAffiliateProgram(this.affiliateCode);
            } else {
              this.completeLogin();
            }
          }
        },
      });
  }

  private joinAffiliateProgram(code: string): void {
    this.affiliateService.joinAffiliateProgram(code).subscribe({
      next: (response) => {
        this.affiliateStorageService.clearAffiliateCode();
        this.messageService.success(`You've joined ${response.relationship?.affiliate.username}'s network!`);
        this.completeLogin();
      },
      error: (err) => {
        console.error('Failed to join affiliate program:', err);
        this.completeLogin();
      },
    });
  }

  private completeLogin(): void {
    this.router.navigateByUrl(this.returnUrl);
    this.themeService.loadTheme();
    this.userService.loadUserDetails();
    this.cookieConsentService.loadCookieConsent();
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
