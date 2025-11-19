// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface PublicPolicy {
  id: string;
  policyType: string;
  version: string;
  title?: string;
  effectiveDate: string;
  content: string;
  contentType: string;
  isActive: boolean;
  isMajorChange?: boolean;
}

export interface PublicPoliciesResponse {
  termsOfService: PublicPolicy | null;
  privacyPolicy: PublicPolicy | null;
  cookiePolicy: PublicPolicy | null;
  affiliateTerms: PublicPolicy | null;
}

@Injectable({
  providedIn: 'root',
})
export class PublicPolicyHttpService {
  constructor(private apollo: Apollo) {}

  /**
   * Get all active public policies using GraphQL (no auth required)
   */
  getActivePolicies(): Observable<PublicPoliciesResponse> {
    const query = gql`
      query GetActivePolicies {
        activePolicies {
          id
          policyType
          version
          title
          content
          contentType
          effectiveDate
          isMajorChange
        }
      }
    `;

    interface ActivePoliciesResult {
      activePolicies: PublicPolicy[];
    }

    return this.apollo
      .query<ActivePoliciesResult>({
        query,
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          const policies = result.data?.activePolicies || [];
          const response: PublicPoliciesResponse = {
            termsOfService: null,
            privacyPolicy: null,
            cookiePolicy: null,
            affiliateTerms: null,
          };

          policies.forEach((policy) => {
            switch (policy.policyType.toLowerCase()) {
              case 'terms_of_service':
                response.termsOfService = policy;
                break;
              case 'privacy_policy':
                response.privacyPolicy = policy;
                break;
              case 'cookie_policy':
                response.cookiePolicy = policy;
                break;
              case 'affiliate_terms':
                response.affiliateTerms = policy;
                break;
            }
          });

          return response;
        }),
      );
  }

  /**
   * Get a specific policy by type using GraphQL (no auth required)
   */
  getPolicy(policyType: string): Observable<PublicPolicy | null> {
    const query = gql`
      query GetPolicyByType($policyType: String!) {
        policyByType(policyType: $policyType) {
          id
          policyType
          version
          title
          content
          contentType
          effectiveDate
          isMajorChange
        }
      }
    `;

    interface PolicyByTypeResult {
      policyByType: PublicPolicy | null;
    }

    return this.apollo
      .query<PolicyByTypeResult>({
        query,
        variables: { policyType },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.policyByType || null));
  }

  /**
   * Get the latest cookie policy version using GraphQL (no auth required)
   */
  getLatestCookiePolicyVersion(): Observable<string | null> {
    const query = gql`
      query GetCookiePolicyVersion {
        policyByType(policyType: "cookie_policy") {
          version
        }
      }
    `;

    interface CookiePolicyVersionResult {
      policyByType: {
        version: string;
      } | null;
    }

    return this.apollo
      .query<CookiePolicyVersionResult>({
        query,
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.policyByType?.version || null));
  }
}
