// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AffiliateService } from '../affiliate/affiliate.service';
import { AffiliateStorageService } from '../affiliate/affiliate-storage.service';
import { GraphqlAuthService } from '../graphql-auth.service';
import { Subscription } from 'rxjs';

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
    MatCheckbox,
    RouterLink,
    MatToolbarModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscriptions = new Subscription();
  private affiliateCode: string | null = null;
  private returnUrl = '/home';

  registerForm = this.fb.group({
    email: [environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]],
    password: [environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(6)]],
    acceptTerms: [false, Validators.requiredTrue],
  });
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private fb: FormBuilder,
    private graphqlAuthService: GraphqlAuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private affiliateService: AffiliateService,
    private affiliateStorageService: AffiliateStorageService,
  ) {}

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
  }

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      email: [environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]],
      password: [environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(6)]],
      acceptTerms: [false, Validators.requiredTrue],
    });

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

  onSubmit(): void {
    this.messageService.clearMessages();
    if (this.registerForm.valid) {
      const email = this.registerForm.get('email')!.value!;
      const password = this.registerForm.get('password')!.value!;
      const acceptTerms = this.registerForm.get('acceptTerms')!.value!;

      this.graphqlAuthService.register(email, password, acceptTerms).subscribe({
        next: (token: unknown) => {
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
            console.debug('Registration successful, email verification required');

            if (this.messageService.messageCount === 0) {
              this.messageService.addMessage({
                type: 'info',
                text: 'Registration successful! Check your email for a verification link.',
                dismissible: true,
              });
            }

            this.router.navigate(['/login'], { queryParams: { returnUrl: this.returnUrl } });
          }
        },
        error: (error: unknown) => {
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
