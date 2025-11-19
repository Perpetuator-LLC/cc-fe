// Copyright (c) 2025 Perpetuator LLC
import { Component, AfterViewInit, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ToolbarService } from '../toolbar.service';
import { AuthService } from '../auth.service';
import { PolicyService, PolicyVersion, PolicyType, PolicyContentType } from '../policy.service';
import { PublicPolicyHttpService, PublicPolicy } from '../public-policy-http.service';

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
    private publicPolicyService: PublicPolicyHttpService,
    private sanitizer: DomSanitizer,
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

    // Use public HTTP endpoint if not logged in, GraphQL if logged in
    if (!this.authService.isLoggedIn()) {
      this.subscriptions.add(
        this.publicPolicyService.getActivePolicies().subscribe({
          next: (policies) => {
            if (policies.termsOfService) {
              this.policy = this.convertPublicToPolicy(policies.termsOfService);
              this.policyContent = this.renderPublicPolicy(policies.termsOfService);
            }
            this.loading = false;
          },
          error: (err) => {
            console.error('Failed to load terms of service:', err);
            this.loading = false;
          },
        }),
      );
    } else {
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

  private convertPublicToPolicy(publicPolicy: PublicPolicy): PolicyVersion {
    return {
      id: publicPolicy.id,
      policyType: publicPolicy.policyType as PolicyType,
      version: publicPolicy.version,
      effectiveDate: publicPolicy.effectiveDate,
      content: publicPolicy.content,
      contentType: publicPolicy.contentType as PolicyContentType,
      isActive: publicPolicy.isActive,
    };
  }

  private renderPublicPolicy(policy: PublicPolicy): SafeHtml {
    if (policy.contentType === 'MARKDOWN') {
      return this.convertMarkdownToHtml(policy.content);
    } else {
      return this.sanitizer.sanitize(1, policy.content) as SafeHtml;
    }
  }

  private convertMarkdownToHtml(markdown: string): SafeHtml {
    let html = markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\[([^\]]+)]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n\n/gim, '</p><p>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    if (!html.startsWith('<h') && !html.startsWith('<ul')) {
      html = `<p>${html}</p>`;
    }

    return this.sanitizer.sanitize(1, html) as SafeHtml;
  }
}
