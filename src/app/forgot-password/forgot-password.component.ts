// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarService } from '../toolbar.service';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageService } from '../message.service';
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

  constructor(
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private graphqlAuthService: GraphqlAuthService,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
  ) {}

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
    this.route.queryParams.subscribe((params) => {
      const email = params['email'];
      if (email) {
        this.forgotForm.patchValue({ email });
      }
    });
  }

  onSubmit() {
    this.messageService.clearMessages();
    this.graphqlAuthService.forgot(this.forgotForm.value.email as string).subscribe({
      next: (success: boolean) => {
        if (!success && this.messageService.messageCount === 0) {
          this.messageService.addMessage({
            type: 'error',
            text: 'Password reset request failed.',
            dismissible: true,
          });
        }
      },
      error: (error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
        this.messageService.addMessage({
          type: 'error',
          text: 'Password reset failed: ' + errorMessage,
          dismissible: true,
        });
        console.error('Password reset failed', error);
      },
    });
  }
}
