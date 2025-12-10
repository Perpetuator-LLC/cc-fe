// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarService } from '../../toolbar.service';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageService } from '../../message.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatInput,
    MatFormField,
    MatLabel,
    MatCardActions,
    MatCardTitle,
    MatButton,
    ReactiveFormsModule,
  ],
  templateUrl: './resend-verification.component.html',
  styleUrl: './resend-verification.component.scss',
})
export class ResendVerificationComponent implements AfterViewInit {
  resendForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngAfterViewInit() {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.route.queryParams.subscribe((params) => {
      const email = params['email'];
      if (email) {
        this.resendForm.patchValue({ email });
      }
    });
  }

  onSubmit() {
    this.messageService.clearMessages();
    this.authService.resend(this.resendForm.value.email as string).subscribe({
      next: () => {
        if (this.messageService.messageCount === 0) {
          this.messageService.addMessage({
            type: 'info',
            text: 'Verification email resent. Check your email...',
            dismissible: true,
          });
        } // else messages were added by authService
      },
      error: (error) => {
        this.messageService.addMessage({
          type: 'error',
          text: 'Resending verification failed: ' + error.toString(),
          dismissible: true,
        });
        console.error('Reset failed', error);
      },
    });
  }
}
