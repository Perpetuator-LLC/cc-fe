// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarService } from '../../layout/toolbar.service';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageService } from '../../message.service';
import { MatToolbarModule } from '@angular/material/toolbar';
import { GraphqlAuthService } from '../graphql-auth.service';

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
    MatToolbarModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent implements AfterViewInit {
  forgotForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  isLoading = false; // Prevent double-submit

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private graphqlAuthService: GraphqlAuthService,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngAfterViewInit() {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
    this.route.queryParams.subscribe((params) => {
      const email = params['email'];
      if (email) {
        this.forgotForm.patchValue({ email });
      }
    });
  }

  onSubmit() {
    // Prevent double-submit
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.messageService.clearMessages();
    this.graphqlAuthService.forgot(this.forgotForm.value.email as string).subscribe({
      next: (success: boolean) => {
        this.isLoading = false;
        if (!success && this.messageService.messageCount === 0) {
          this.messageService.addMessage({
            type: 'error',
            text: 'Password reset request failed.',
            dismissible: true,
          });
        }
        // Success message already handled by GraphqlAuthService.forgot()
      },
      error: (error: unknown) => {
        this.isLoading = false;
        // Error message already handled by GraphqlAuthService.forgot()
        console.error('Password reset failed', error);
      },
    });
  }
}
