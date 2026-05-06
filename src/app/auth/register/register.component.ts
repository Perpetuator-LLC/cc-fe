// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { ToolbarService } from '../../layout/toolbar.service';
import { MessageService } from '../../message.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AffiliateService } from '../../affiliate/affiliate.service';
import { AffiliateStorageService } from '../../affiliate/affiliate-storage.service';
import { GraphqlAuthService } from '../graphql-auth.service';
import { Subscription } from 'rxjs';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCard,
    MatError,
    MatLabel,
    MatCardTitle,
    MatCardHeader,
    MatCardContent,
    MatFormField,
    MatCardActions,
    MatInput,
    MatButton,
    MatIconButton,
    MatCheckbox,
    MatIcon,
    RouterLink,
    MatToolbarModule,
    MatProgressSpinner,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private graphqlAuthService = inject(GraphqlAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toolbarService = inject(ToolbarService);
  private messageService = inject(MessageService);
  private affiliateService = inject(AffiliateService);
  private affiliateStorageService = inject(AffiliateStorageService);

  private subscriptions = new Subscription();
  private affiliateCode: string | null = null;
  private returnUrl = '/home';
  hidePassword = true;
  loading = false;

  registerForm = this.fb.group({
    email: [environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]],
    password: [environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(6)]],
    acceptTerms: [false as boolean, Validators.requiredTrue],
  });
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  ngAfterViewInit() {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
  }

  ngOnInit(): void {
    // Form already initialized in class property

    this.route.queryParams.subscribe((params) => {
      const refCode = params['ref'];
      if (refCode) {
        this.affiliateCode = refCode;
        this.affiliateStorageService.setAffiliateCode(refCode);
      } else {
        this.affiliateCode = this.affiliateStorageService.getAffiliateCode();
      }

      const queryReturnUrl = params['returnUrl'];
      const storedReturnUrl = this.affiliateStorageService.getReturnUrl();

      if (queryReturnUrl) {
        this.returnUrl = queryReturnUrl;
        this.affiliateStorageService.setReturnUrl(queryReturnUrl);
      } else if (storedReturnUrl) {
        this.returnUrl = storedReturnUrl;
      } else {
        this.returnUrl = '/home';
      }
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onSubmit(): void {
    this.messageService.clearMessages();
    if (this.registerForm.valid) {
      this.loading = true;
      const email = this.registerForm.get('email')!.value!;
      const password = this.registerForm.get('password')!.value!;
      const acceptTerms = this.registerForm.get('acceptTerms')!.value!;

      this.graphqlAuthService.register(email, password, acceptTerms).subscribe({
        next: (token: unknown) => {
          this.loading = false;
          if (token) {
            // Registration successful with tokens (email verification not required)
            console.debug('Registration successful with tokens');

            if (this.affiliateCode) {
              this.joinAffiliateProgram(this.affiliateCode);
            } else {
              this.messageService.addMessage({
                type: 'success',
                text: 'Registration successful! Welcome!',
                dismissible: true,
              });
              this.router.navigate([this.returnUrl]);
            }
          } else {
            // Registration successful but email verification required

            if (this.messageService.messageCount === 0) {
              this.messageService.addMessage({
                type: 'info',
                text: 'Registration successful! Check your email for a verification link.',
                dismissible: true,
              });
            }
            // this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
          }
        },
        error: (error: unknown) => {
          this.loading = false;
          const errorMessage = error instanceof Error ? error.message : 'Registration failed';
          this.messageService.addMessage({
            type: 'error',
            text: 'Registration failed: ' + errorMessage,
            dismissible: true,
          });
          console.error('Registration failed', error);
        },
      });
    }
  }

  private joinAffiliateProgram(code: string): void {
    this.subscriptions.add(
      this.affiliateService.joinAffiliateProgram(code).subscribe({
        next: (response) => {
          this.affiliateStorageService.clearAffiliateCode();
          this.messageService.addMessage({
            type: 'success',
            text: `Registration successful! You've joined ${response.relationship?.affiliate.username}'s network. Check
            your email for verification.`,
            dismissible: true,
          });
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
        },
        error: (err) => {
          console.error('Failed to join affiliate program:', err);
          // Show affiliate error message
          const errorMessage = err?.message || 'Failed to join affiliate program';
          this.messageService.error(errorMessage);
          this.affiliateStorageService.clearAffiliateCode();
          // Still show registration success
          this.messageService.addMessage({
            type: 'success',
            text: 'Registration successful! Check your email for a verification link.',
            dismissible: true,
          });
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
        },
      }),
    );
  }
}
