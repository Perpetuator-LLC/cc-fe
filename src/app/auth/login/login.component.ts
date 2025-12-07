// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { ToolbarService } from '../../toolbar.service';
import { MessageService } from '../../message.service';
import { ThemeService } from '../../theme.service';
import { Subscription } from 'rxjs';
import { UserService } from '../../user/user.service';
import { MatDialog } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AffiliateStorageService } from '../../affiliate/affiliate-storage.service';
import { AffiliateService } from '../../affiliate/affiliate.service';
import { PolicyGuardService } from '../../policy/services/policy-guard.service';
import { GraphqlAuthService } from '../graphql-auth.service';

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
    MatIcon,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  private subscription: Subscription | undefined;
  private affiliateCode: string | null = null;
  errorMessage: string | null = null;

  loginForm = new FormGroup({
    // TODO: Add validation equivalent to back-end
    password: new FormControl(environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(5)]),
    email: new FormControl(environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]),
  });
  returnUrl = '';
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private graphqlAuthService: GraphqlAuthService,
    private route: ActivatedRoute,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private themeService: ThemeService,
    private userService: UserService,
    private dialog: MatDialog,
    private affiliateService: AffiliateService,
    private affiliateStorageService: AffiliateStorageService,
    private policyGuardService: PolicyGuardService,
  ) {
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
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
  }

  onSubmit() {
    this.messageService.clearMessages();
    this.errorMessage = null; // Clear previous errors

    this.subscription = this.graphqlAuthService
      .login(this.loginForm.value.email as string, this.loginForm.value.password as string)
      .subscribe({
        next: (success) => {
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
          // Capture the error message for display
          this.errorMessage = error.message;
        },
      });
  }

  /**
   * Check if error is about unverified email
   */
  isEmailNotVerified(): boolean {
    return this.errorMessage?.toLowerCase().includes('not verified') || false;
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
