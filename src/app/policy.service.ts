// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map, Observable, of, switchMap } from 'rxjs';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export enum PolicyType {
  TERMS_OF_SERVICE = 'TERMS_OF_SERVICE',
  PRIVACY_POLICY = 'PRIVACY_POLICY',
  AFFILIATE_TERMS = 'AFFILIATE_TERMS',
  COOKIE_POLICY = 'COOKIE_POLICY',
}

export enum PolicyContentType {
  MARKDOWN = 'MARKDOWN',
  HTML = 'HTML',
}

export interface PolicyVersion {
  id: string;
  policyType: PolicyType;
  version: string;
  effectiveDate: string;
  content: string;
  contentType: PolicyContentType;
  isActive: boolean;
}

export interface PolicyAcceptance {
  id: string;
  policy: PolicyVersion;
  acceptedAt: string;
  signature: string | null;
}

interface ActivePoliciesResult {
  termsOfService: PolicyVersion | null;
  privacyPolicy: PolicyVersion | null;
  affiliateTerms: PolicyVersion | null;
  cookiePolicy: PolicyVersion | null;
}

@Injectable({
  providedIn: 'root',
})
export class PolicyService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
    private sanitizer: DomSanitizer,
  ) {
    super(apollo, errorHandler);
  }

  getActivePolicies(): Observable<ActivePoliciesResult> {
    const ACTIVE_POLICIES_QUERY = gql`
      query ActivePolicies {
        activePolicies {
          id
          policyType
          version
          effectiveDate
          content
          contentType
          isActive
        }
      }
    `;

    interface ActivePoliciesQueryResponse {
      activePolicies: PolicyVersion[];
    }

    return this.query<ActivePoliciesQueryResponse>({
      query: ACTIVE_POLICIES_QUERY,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        const policies = data?.activePolicies || [];
        const result: ActivePoliciesResult = {
          termsOfService: null,
          privacyPolicy: null,
          affiliateTerms: null,
          cookiePolicy: null,
        };

        policies.forEach((policy) => {
          switch (policy.policyType) {
            case PolicyType.TERMS_OF_SERVICE:
              result.termsOfService = policy;
              break;
            case PolicyType.PRIVACY_POLICY:
              result.privacyPolicy = policy;
              break;
            case PolicyType.AFFILIATE_TERMS:
              result.affiliateTerms = policy;
              break;
            case PolicyType.COOKIE_POLICY:
              result.cookiePolicy = policy;
              break;
          }
        });

        return result;
      }),
    );
  }

  convertMarkdownToHtml(markdown: string): SafeHtml {
    // Using a simple markdown conversion - in production, consider using 'marked' library
    // For now, basic conversion:
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      // Line breaks
      .replace(/\n\n/gim, '</p><p>')
      // Lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    // Wrap in paragraph tags if not already wrapped
    if (!html.startsWith('<h') && !html.startsWith('<ul')) {
      html = `<p>${html}</p>`;
    }

    return this.sanitizer.sanitize(1, html) as SafeHtml;
  }

  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.sanitize(1, html) as SafeHtml;
  }

  renderPolicyContent(policy: PolicyVersion): SafeHtml {
    if (policy.contentType === PolicyContentType.MARKDOWN) {
      return this.convertMarkdownToHtml(policy.content);
    } else {
      return this.sanitizeHtml(policy.content);
    }
  }

  /**
   * Accept a policy by ID
   * @param policyId - UUID of the policy to accept
   * @param signature - Optional signature for pre-signup acceptances
   * @returns Observable with success status
   */
  acceptPolicy(policyId: string, signature?: string): Observable<{ success: boolean; message: string }> {
    const ACCEPT_POLICY = gql`
      mutation AcceptPolicy($policyId: UUID!, $signature: String) {
        acceptPolicy(policyId: $policyId, signature: $signature) {
          success
          message
          acceptance {
            id
            acceptedAt
          }
        }
      }
    `;

    interface AcceptPolicyResponse {
      acceptPolicy: {
        success: boolean;
        message: string;
        acceptance: {
          id: string;
          acceptedAt: string;
        };
      };
    }

    return this.mutate<AcceptPolicyResponse>({
      mutation: ACCEPT_POLICY,
      variables: { policyId, signature },
    }).pipe(
      map((data) => {
        if (!data.acceptPolicy.success) {
          throw new Error(data.acceptPolicy.message);
        }
        return {
          success: data.acceptPolicy.success,
          message: data.acceptPolicy.message,
        };
      }),
    );
  }

  /**
   * Get all policy acceptances for the current user
   */
  getMyPolicyAcceptances(): Observable<PolicyAcceptance[]> {
    const MY_POLICY_ACCEPTANCES = gql`
      query MyPolicyAcceptances {
        myPolicyAcceptances {
          id
          policy {
            id
            policyType
            version
            effectiveDate
            content
            contentType
            isActive
          }
          acceptedAt
          signature
        }
      }
    `;

    interface MyPolicyAcceptancesResponse {
      myPolicyAcceptances: PolicyAcceptance[];
    }

    return this.query<MyPolicyAcceptancesResponse>({
      query: MY_POLICY_ACCEPTANCES,
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.myPolicyAcceptances));
  }

  /**
   * Check which required policies need to be accepted
   * Returns active policies that the user hasn't accepted or accepted an older version
   */
  getMissingRequiredPolicies(): Observable<PolicyVersion[]> {
    return this.getActivePolicies().pipe(
      switchMap((activePolicies) => {
        return this.getMyPolicyAcceptances().pipe(
          map((acceptances) => {
            const missing: PolicyVersion[] = [];

            // Check each required policy (exclude AFFILIATE_TERMS as it's optional)
            const requiredPolicies = [
              { type: PolicyType.TERMS_OF_SERVICE, policy: activePolicies.termsOfService },
              { type: PolicyType.PRIVACY_POLICY, policy: activePolicies.privacyPolicy },
              { type: PolicyType.COOKIE_POLICY, policy: activePolicies.cookiePolicy },
            ];

            requiredPolicies.forEach(({ type, policy }) => {
              if (!policy) return;

              const acceptance = acceptances.find((a) => a.policy.policyType === type);

              // Policy is missing if:
              // 1. User has never accepted it, OR
              // 2. User accepted an older version (version mismatch)
              if (!acceptance || acceptance.policy.version !== policy.version) {
                missing.push(policy);
              }
            });

            return missing;
          }),
        );
      }),
    );
  }

  /**
   * Check if a specific policy type has been accepted (current version)
   */
  hasPolicyBeenAccepted(policyType: PolicyType): Observable<boolean> {
    return this.getActivePolicies().pipe(
      switchMap((activePolicies) => {
        let activePolicy: PolicyVersion | null = null;

        switch (policyType) {
          case PolicyType.TERMS_OF_SERVICE:
            activePolicy = activePolicies.termsOfService;
            break;
          case PolicyType.PRIVACY_POLICY:
            activePolicy = activePolicies.privacyPolicy;
            break;
          case PolicyType.COOKIE_POLICY:
            activePolicy = activePolicies.cookiePolicy;
            break;
          case PolicyType.AFFILIATE_TERMS:
            activePolicy = activePolicies.affiliateTerms;
            break;
        }

        if (!activePolicy) {
          return of(false);
        }

        return this.getMyPolicyAcceptances().pipe(
          map((acceptances) => {
            const acceptance = acceptances.find((a) => a.policy.policyType === policyType);
            return acceptance?.policy.version === activePolicy?.version;
          }),
        );
      }),
    );
  }
}
