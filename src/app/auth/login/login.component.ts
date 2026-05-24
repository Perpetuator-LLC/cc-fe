// Copyright (c) 2025-2026 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { AppConfigService } from '../../core/app-config.service';
import { ToolbarService } from '../../layout/toolbar.service';
import { MessageService } from '../../message.service';
import { ThemeService } from '../../layout/theme.service';
import { Subscription } from 'rxjs';
import { UserService } from '../../user/user.service';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AffiliateStorageService } from '../../affiliate/affiliate-storage.service';
import { AffiliateService } from '../../affiliate/affiliate.service';
import { PolicyGuardService } from '../../policy/services/policy-guard.service';
import { GraphqlAuthService } from '../graphql-auth.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatToolbarModule,
    MatError,
    MatFormField,
    MatInput,
    MatButton,
    MatIconButton,
    MatLabel,
    MatCard,
    MatCardTitle,
    MatCardHeader,
    MatCardContent,
    MatCardActions,
    MatIcon,
    RouterLink,
    MatProgressSpinner,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private appConfig = inject(AppConfigService);
  private graphqlAuthService = inject(GraphqlAuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toolbarService = inject(ToolbarService);
  private messageService = inject(MessageService);
  private themeService = inject(ThemeService);
  private userService = inject(UserService);
  private dialog = inject(MatDialog);
  private affiliateService = inject(AffiliateService);
  private affiliateStorageService = inject(AffiliateStorageService);
  private policyGuardService = inject(PolicyGuardService);

  private subscription: Subscription | undefined;
  private affiliateCode: string | null = null;
  errorMessage: string | null = null;
  loading = false;

  loginForm = new FormGroup({
    password: new FormControl(this.appConfig.config.TEST_PASSWORD ?? '', [
      Validators.required,
      Validators.minLength(6),
    ]),
    email: new FormControl(this.appConfig.config.TEST_EMAIL ?? '', [Validators.required, Validators.email]),
  });
  returnUrl = '';
  hidePassword = true;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor() {
    const queryReturnUrl = this.route.snapshot.queryParams['returnUrl'];
    const storedReturnUrl = this.affiliateStorageService.getReturnUrl();

    if (queryReturnUrl) {
      this.returnUrl = queryReturnUrl;
      this.affiliateStorageService.setReturnUrl(queryReturnUrl);
    } else if (storedReturnUrl) {
      this.returnUrl = storedReturnUrl;
    } else {
      this.returnUrl = '/home';
    }

    const refCode = this.route.snapshot.queryParams['ref'];
    if (refCode) {
      this.affiliateCode = refCode;
      this.affiliateStorageService.setAffiliateCode(refCode);
    } else {
      this.affiliateCode = this.affiliateStorageService.getAffiliateCode();
    }
  }

  ngAfterViewInit() {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
  }

  onSubmit() {
    this.messageService.clearMessages();
    this.errorMessage = null; // Clear previous errors
    this.loading = true;

    this.subscription = this.graphqlAuthService
      .login(this.loginForm.value.email as string, this.loginForm.value.password as string)
      .subscribe({
        next: (success) => {
          this.loading = false;
          if (success) {
            // Login successful - proceed with post-login flow
            if (this.affiliateCode) {
              this.joinAffiliateProgram(this.affiliateCode);
            } else {
              this.completeLogin();
            }
          }
          // If not successful, error message was already shown by the service
        },
        error: (error: Error) => {
          this.loading = false;
          // Capture the error message for display
          this.errorMessage = error.message;
        },
      });
  }

  /**
   * Check if error is about unverified email
   */
  get isEmailNotVerified(): boolean {
    return this.errorMessage?.toLowerCase().includes('not verified') || false;
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  /**
   * Navigate to resend verification page with email pre-filled
   */
  resendVerification(): void {
    const email = this.loginForm.get('email')?.value;
    if (email) {
      this.router.navigate(['/resend-verification'], {
        queryParams: { email },
      });
    }
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
        // Show error message to user
        const errorMessage = err?.message || 'Failed to join affiliate program';
        this.messageService.error(errorMessage);
        this.affiliateStorageService.clearAffiliateCode();
        this.completeLogin();
      },
    });
  }

  private completeLogin(): void {
    this.affiliateStorageService.clearReturnUrl();
    this.themeService.loadTheme();
    this.userService.loadUserDetails();

    // Check for required policy acceptances before navigating
    this.policyGuardService.checkPoliciesNow().subscribe({
      next: (policiesAccepted) => {
        if (policiesAccepted) {
          this.router.navigateByUrl(this.returnUrl);
        }
        // If not accepted, user will be logged out by PolicyGuardService
      },
      error: (err) => {
        console.error('Error checking policies:', err);
        // Still navigate on error to avoid blocking user
        this.router.navigateByUrl(this.returnUrl);
      },
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
