// Copyright (c) 2025-2026 Perpetuator LLC
import { Component, AfterViewInit, OnInit, OnDestroy, TemplateRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ToolbarService } from '../../layout/toolbar.service';
import { AuthService } from '../../auth/auth.service';
import { PolicyService, PolicyVersion } from '../services/policy.service';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardContent, MatProgressSpinner],
  templateUrl: './privacy-policy.component.html',
  styleUrls: ['./privacy-policy.component.scss'],
})
export class PrivacyPolicyComponent implements OnInit, AfterViewInit, OnDestroy {
  private toolbarService = inject(ToolbarService);
  protected authService = inject(AuthService);
  private policyService = inject(PolicyService);

  protected readonly Date = Date;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  loading = true;
  policy: PolicyVersion | null = null;
  policyContent: SafeHtml | null = null;

  ngOnInit(): void {
    this.loadPolicy();
  }

  ngAfterViewInit() {
    this.toolbarService.setToolbarTemplate(this.toolbarTemplate);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private loadPolicy(): void {
    this.loading = true;

    // PolicyService now handles both authenticated and unauthenticated access
    // and caches the result for the session
    this.subscriptions.add(
      this.policyService.getActivePolicies().subscribe({
        next: (policies) => {
          this.policy = policies.privacyPolicy;
          if (this.policy) {
            this.policyContent = this.policyService.renderPolicyContent(this.policy);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load privacy policy:', err);
          this.loading = false;
        },
      }),
    );
  }
}
