// Copyright (c) 2025 Perpetuator LLC
import { AfterViewInit, Component, TemplateRef, ViewChild } from '@angular/core';
import { MatCard, MatCardActions, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToolbarService } from '../toolbar.service';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MessageService } from '../message.service';
import { MessageComponent } from '../message/message.component';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TermsAndConditionsModalComponent } from '../terms-and-conditions-modal.component';
import { PrivacyPolicyModalComponent } from '../privacy-policy-modal.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    MatInput,
    MatFormField,
    MatLabel,
    MatCardActions,
    MatCardTitle,
    MatButton,
    ReactiveFormsModule,
    MessageComponent,
    MatToolbarModule,
    RouterLink,
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
    private authService: AuthService,
    private router: Router,
    private toolbarService: ToolbarService,
    private messageService: MessageService,
    private dialog: MatDialog,
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
    this.authService.forgot(this.forgotForm.value.email as string).subscribe({
      next: () => {
        if (this.messageService.messageCount === 0) {
          this.messageService.addMessage({
            type: 'success',
            text: 'Password reset email sent!',
            dismissible: true,
          });
        }
      },
      error: (error) => {
        this.messageService.addMessage({
          type: 'error',
          text: 'Password reset failed: ' + error.toString(),
          dismissible: true,
        });
        console.error('Password reset failed', error);
      },
    });
  }
  openTermsModal(event: Event) {
    event.preventDefault();
    this.dialog.open(TermsAndConditionsModalComponent, {
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'privacy-policy-modal',
    });
  }

  openPrivacyModal(event: Event) {
    event.preventDefault();
    this.dialog.open(PrivacyPolicyModalComponent, {
      width: '80vw',
      maxWidth: '900px',
      panelClass: 'privacy-policy-modal',
    });
  }
}
