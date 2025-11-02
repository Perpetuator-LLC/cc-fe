// Copyright (c) 2025 Perpetuator LLC
import { Component, OnInit, TemplateRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { environment } from '../../environments/environment';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { MatError, MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { ToolbarService } from '../toolbar.service';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AffiliateService } from '../affiliate.service';
import { AffiliateStorageService } from '../affiliate-storage.service';
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
    MessageComponent,
    RouterLink,
    MatToolbarModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, AfterViewInit, OnDestroy {
  private subscriptions = new Subscription();
  private affiliateCode: string | null = null;

  registerForm = this.fb.group({
    email: [environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]],
    password: [environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(6)]],
    acceptTerms: [false, Validators.requiredTrue],
  });
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
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

      this.authService.register(email, password).subscribe({
        next: (token) => {
          if (token) {
            console.debug('Registration successful');

            if (this.affiliateCode) {
              this.joinAffiliateProgram(this.affiliateCode);
            } else {
              this.messageService.addMessage({
                type: 'success',
                text: 'Registration successful! Check your email for a verification link.',
                dismissible: true,
              });
              this.router.navigate(['/login']);
            }
          } else {
            if (this.messageService.messageCount === 0) {
              this.messageService.addMessage({
                type: 'error',
                text: 'Registration failed with no token returned.',
                dismissible: true,
              });
            }
          }
        },
        error: (error) => {
          this.messageService.addMessage({
            type: 'error',
            text: 'Registration failed: ' + error.toString(),
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
            text: `Registration successful! You've joined ${response.relationship?.affiliateUsername}'s network. Check
            your email for verification.`,
            dismissible: true,
          });
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('Failed to join affiliate program:', err);
          this.messageService.addMessage({
            type: 'success',
            text: 'Registration successful! Check your email for a verification link.',
            dismissible: true,
          });
          this.router.navigate(['/login']);
        },
      }),
    );
  }
}
