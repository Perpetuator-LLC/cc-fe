// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';
import { PolicyService, PolicyVersion } from '../policy.service';

@Component({
  selector: 'app-eula',
  standalone: true,
  imports: [CommonModule, MatCard, MatCardContent, MatProgressSpinner],
  templateUrl: './terms-and-conditions.component.html',
  styleUrl: './terms-and-conditions.component.scss',
})
export class TermsAndConditionsComponent implements OnInit, AfterViewInit, OnDestroy {
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
    this.subscriptions.add(
      this.policyService.getActivePolicies().subscribe({
        next: (policies) => {
          this.policy = policies.termsOfService;
          if (this.policy) {
            this.policyContent = this.policyService.renderPolicyContent(this.policy);
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load terms of service:', err);
          this.loading = false;
        },
      }),
    );
  }
}
