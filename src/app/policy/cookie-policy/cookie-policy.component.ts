// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ToolbarService } from '../../toolbar.service';
import { AuthService } from '../../auth/auth.service';
import { PolicyService, PolicyVersion } from '../services/policy.service';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardContent, MatProgressSpinner],
  templateUrl: './cookie-policy.component.html',
  styleUrls: ['./cookie-policy.component.scss'],
})
export class CookiePolicyComponent implements OnInit, AfterViewInit, OnDestroy {
  protected readonly Date = Date;
  @ViewChild('toolbarTemplate', { static: true }) toolbarTemplate!: TemplateRef<never>;
  private subscriptions = new Subscription();
  loading = true;
  policy: PolicyVersion | null = null;
  policyContent: SafeHtml | null = null;

  constructor(
    private toolbarService: ToolbarService,
    protected authService: AuthService,
    private policyService: PolicyService,
  ) {}

  ngOnInit(): void {
    this.loadPolicy();
  }

  ngAfterViewInit() {
    const viewContainerRef = this.toolbarService.getViewContainerRef();
    viewContainerRef.clear();
    viewContainerRef.createEmbeddedView(this.toolbarTemplate);
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
          this.policy = policies.cookiePolicy;
          if (this.policy) {
            this.policyContent = this.policyService.renderPolicyContent(this.policy);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load cookie policy:', err);
          this.loading = false;
        },
      }),
    );
  }
}
