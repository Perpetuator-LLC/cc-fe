import { AfterViewInit, Component, TemplateRef, ViewChild, OnDestroy } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
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
  loginForm = new FormGroup({
    // TODO: Add validation equivalent to back-end
    password: new FormControl(environment.TEST_PASSWORD ?? '', [Validators.required, Validators.minLength(5)]),
    email: new FormControl(environment.TEST_EMAIL ?? '', [Validators.required, Validators.email]),
  });
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private themeService: ThemeService,
    private cookieConsentService: CookieConsentService,
  ) {}

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
            this.router.navigate(['/']);
            this.themeService.loadTheme();
            this.cookieConsentService.loadCookieConsent();
          } else {
            this.messageService.addMessage({
              type: 'error',
              text: 'Login failed. Please try again.',
              dismissible: true,
            });
          }
        },
        error: (error) => {
          this.messageService.addMessage({
            type: 'error',
            text: 'Login failed: ' + error.toString(),
            dismissible: true,
          });
          console.error('Login failed', error);
        },
      });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
