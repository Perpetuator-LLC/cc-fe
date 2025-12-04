// Copyright (c) 2025 Perpetuator LLC
import { Injectable, effect } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { BaseService } from '../../base.service';
import { ErrorHandlerService } from '../../error-handler.service';
import { AuthService } from '../../auth.service';

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
  effectiveDate?: string;
  content?: string;
  contentType?: PolicyContentType;
  isActive?: boolean;
  title?: string;
  isMajorChange?: boolean;
}

export interface PolicyAcceptance {
  id: string;
  policy: PolicyVersion;
  acceptedAt: string;
  signature: string | null;
}

export interface ActivePoliciesResult {
  termsOfService: PolicyVersion | null;
  privacyPolicy: PolicyVersion | null;
  affiliateTerms: PolicyVersion | null;
  cookiePolicy: PolicyVersion | null;
}

@Injectable({
  providedIn: 'root',
})
export class PolicyService extends BaseService {
  private wasLoggedIn = false;

  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
    private sanitizer: DomSanitizer,
    private authService: AuthService,
  ) {
    super(apollo, errorHandler);

    // Monitor auth state to clear cache on logout
    this.wasLoggedIn = this.authService.isLoggedIn();

    // Use effect to watch for logout events
    effect(
      () => {
        const isLoggedIn = this.authService.isLoggedIn();

        // If user was logged in and now is not, they logged out
        if (this.wasLoggedIn && !isLoggedIn) {
          this.clearActivePoliciesCache();
        }

        // Update state for next check
        this.wasLoggedIn = isLoggedIn;
      },
      { allowSignalWrites: true },
    );
  }

  /**
   * Get active policies metadata (minimal fields for version comparison)
   * Use this for checking which policies need acceptance - does NOT fetch content
   * @param forceRefresh - Force a fresh fetch from the server
   */
  getActivePoliciesMetadata(forceRefresh = false): Observable<ActivePoliciesResult> {
    const ACTIVE_POLICIES_METADATA_QUERY = gql`
      query ActivePoliciesMetadata {
        activePolicies {
          id
          policyType
          version
          # Minimal fields - NO content, title, effectiveDate, etc.
        }
      }
    `;

    interface ActivePoliciesQueryResponse {
      activePolicies: PolicyVersion[];
    }

    const fetchPolicy = forceRefresh ? 'network-only' : 'cache-first';

    return this.query<ActivePoliciesQueryResponse>({
      query: ACTIVE_POLICIES_METADATA_QUERY,
      fetchPolicy: fetchPolicy,
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

  /**
   * Get active policies with Apollo cache
   * Uses Apollo's built-in cache which is automatically cleared on logout
   * @param forceRefresh - Force a fresh fetch from the server
   */
  getActivePolicies(forceRefresh = false): Observable<ActivePoliciesResult> {
    const ACTIVE_POLICIES_QUERY = gql`
      query ActivePolicies {
        activePolicies {
          id
          policyType
          version
          title
          effectiveDate
          content
          contentType
          isActive
          isMajorChange
        }
      }
    `;

    interface ActivePoliciesQueryResponse {
      activePolicies: PolicyVersion[];
    }

    const fetchPolicy = forceRefresh ? 'network-only' : 'cache-first';

    return this.query<ActivePoliciesQueryResponse>({
      query: ACTIVE_POLICIES_QUERY,
      fetchPolicy: fetchPolicy,
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

  /**
   * Clear the active policies cache
   * Call this when policies are updated or user logs out
   * This evicts the query from Apollo's cache
   */
  clearActivePoliciesCache(): void {
    try {
      // Evict the activePolicies query from Apollo cache
      this.apollo.client.cache.evict({ fieldName: 'activePolicies' });
      this.apollo.client.cache.evict({ fieldName: 'myPolicyAcceptances' });
      // Trigger garbage collection to remove evicted entries
      this.apollo.client.cache.gc();
    } catch (e) {
      console.error('[PolicyService] Failed to clear cache:', e);
    }
  }

  /**
   * Get a specific policy by type (full content for display)
   * Use this only when you need to display the policy content to the user
   * For version checks, use getActivePoliciesMetadata() instead
   * @param policyType - The type of policy to retrieve
   */
  getPolicy(policyType: PolicyType): Observable<PolicyVersion | null> {
    return this.getActivePolicies().pipe(
      map((policies) => {
        switch (policyType) {
          case PolicyType.TERMS_OF_SERVICE:
            return policies.termsOfService;
          case PolicyType.PRIVACY_POLICY:
            return policies.privacyPolicy;
          case PolicyType.COOKIE_POLICY:
            return policies.cookiePolicy;
          case PolicyType.AFFILIATE_TERMS:
            return policies.affiliateTerms;
          default:
            return null;
        }
      }),
    );
  }

  /**
   * Get the latest cookie policy version
   */
  getLatestCookiePolicyVersion(): Observable<string | null> {
    return this.getPolicy(PolicyType.COOKIE_POLICY).pipe(map((policy) => policy?.version || null));
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
    if (!policy.content) {
      return this.sanitizer.sanitize(1, '<p>Loading policy content...</p>') as SafeHtml;
    }

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

    // Optimized refetch query - only fetch minimal data needed for comparison
    const MY_POLICY_ACCEPTANCES_REFETCH = gql`
      query MyPolicyAcceptances {
        myPolicyAcceptances {
          id
          policy {
            id
            policyType
            version
            # Minimal fields only - no content to reduce payload
          }
          acceptedAt
          signature
        }
      }
    `;

    return this.mutate<AcceptPolicyResponse>({
      mutation: ACCEPT_POLICY,
      variables: { policyId, signature },
      refetchQueries: [{ query: MY_POLICY_ACCEPTANCES_REFETCH }],
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
   * Only fetches minimal data needed for version comparison (no content)
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
            # Minimal fields - no content, effectiveDate, etc. to reduce payload size
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
      fetchPolicy: 'cache-first', // Use cache to prevent infinite loops
    }).pipe(map((data) => data.myPolicyAcceptances));
  }

  /**
   * Check which required policies need to be accepted
   * Returns active policies that the user hasn't accepted or accepted an older version
   */
  getMissingRequiredPolicies(): Observable<PolicyVersion[]> {
    // Use metadata query to avoid fetching full content
    return this.getActivePoliciesMetadata().pipe(
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
              if (!policy) {
                return;
              }

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
   * Uses metadata query to avoid fetching full content
   */
  hasPolicyBeenAccepted(policyType: PolicyType): Observable<boolean> {
    return this.getActivePoliciesMetadata().pipe(
      take(1), // Complete after first emission to prevent loops
      switchMap((activePolicies: ActivePoliciesResult) => {
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
