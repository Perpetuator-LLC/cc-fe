// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BaseService } from '../base.service';
import { ErrorHandlerService } from '../utils/error-handler.service';

/**
 * Affiliate Service (GraphQL)
 *
 * PURPOSE: Provides GraphQL operations for affiliate functionality.
 * - Public queries (e.g., affiliateLanding) - No auth required
 * - Authenticated queries/mutations - Require valid auth token
 *
 * ARCHITECTURE NOTE:
 * - AffiliateService: GraphQL for both public and authenticated operations
 * - AffiliateHttpService: DEPRECATED - Use GraphQL instead
 *
 * Migration from HTTP to GraphQL complete as of Dec 2025.
 */

/**
 * Affiliate Credit Conversion Constants
 * Rate: 1,000 affiliate credits = $1.00 USD
 */
export const AFFILIATE_CREDITS_PER_DOLLAR = 1000;
export const MIN_CASH_PAYOUT_CREDITS = 10000; // $10.00 minimum

/**
 * Utility functions for affiliate credit conversions
 */
export class AffiliateConversionUtils {
  /**
   * Convert affiliate credits to dollar amount
   * @param credits - Number of affiliate credits
   * @returns Dollar amount as string (e.g., "21.00")
   */
  static creditsToDollars(credits: number): string {
    return (credits / AFFILIATE_CREDITS_PER_DOLLAR).toFixed(2);
  }

  /**
   * Convert cents to dollar amount (for targetAmount from backend)
   * Backend stores cash amounts in cents
   * @param cents - Amount in cents
   * @returns Dollar amount as string (e.g., "21.00")
   */
  static centsToDollars(cents: number): string {
    return (cents / 100).toFixed(2);
  }

  /**
   * Format affiliate credits to USD display
   * @param credits - Number of affiliate credits
   * @returns Formatted string (e.g., "$21.00")
   */
  static formatCreditsAsUSD(credits: number): string {
    return `$${this.creditsToDollars(credits)}`;
  }

  /**
   * Format cents to USD display
   * @param cents - Amount in cents
   * @returns Formatted string (e.g., "$21.00")
   */
  static formatCentsAsUSD(cents: number): string {
    return `$${this.centsToDollars(cents)}`;
  }

  /**
   * Convert dollars to affiliate credits
   * @param dollars - Dollar amount
   * @returns Number of affiliate credits
   */
  static dollarsToCredits(dollars: number): number {
    return Math.floor(dollars * AFFILIATE_CREDITS_PER_DOLLAR);
  }
}

export interface PublicUser {
  uuid: string;
  username: string;
}

export interface AffiliateLanding {
  affiliateCode: string;
  affiliateUsername: string;
  brandImageUrl: string | null;
  customMessage: string | null;
}

export interface AffiliateProfile {
  uuid: string;
  user: PublicUser;
  code: string;
  brandImageUrl: string | null;
  customMessage: string | null;
  isActive: boolean;
  eligibilityStatus?: string | null;
  eligibilityMessage?: string | null;
  stripeAccountId?: string | null;
  stripeOnboardingCompleted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeCountry?: string | null;
  stripeDetailsSubmitted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateRelationship {
  uuid: string;
  tier: number;
  affiliate: PublicUser;
  referredUser: PublicUser;
  referredUserHasAffiliateProfile: boolean;
  createdAt: string;
}

export interface AffiliateStats {
  totalAffiliateCredits: number;
  totalReferrals: number;
  tier1Referrals: number;
  tier2Referrals: number;
}

export interface AffiliateCredit {
  uuid: string;
  amount: number;
  tier: number;
  sourceUser?: PublicUser | null;
  description: string;
  createdAt: string;
}

export interface AffiliateConversion {
  uuid?: string;
  conversionType: string;
  affiliateCreditAmount: number;
  targetAmount: number;
  status: string;
  stripeTransferId?: string | null;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AffiliateTermsConsent {
  version: string;
  accepted: boolean;
  date: string;
}

export interface PolicyAcceptance {
  id: string;
  policy: {
    id: string;
    policyType: string;
    version: string;
  };
  signature: string;
  acceptedAt: string;
}

export interface AffiliateCodeChangeInfo {
  canChange: boolean;
  daysUntilNextChange: number;
  changeCount: number;
  lastChangeDate: string | null;
}

export interface AffiliateCodeHistory {
  uuid: string;
  oldCode: string;
  newCode: string;
  changedAt: string;
  reason: string | null;
}

export interface AffiliateEligibility {
  isEligible: boolean;
  reason: string;
  hasPaidOrder: boolean;
}

export interface AffiliateCodeChangeRequest {
  uuid: string;
  user?: PublicUser | null;
  requestedCode: string;
  currentCode: string;
  status: 'pending' | 'approved' | 'rejected';
  reason: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
}

interface JoinAffiliateProgramResponse {
  joinAffiliateProgram: {
    success: boolean;
    message: string;
    relationship: AffiliateRelationship | null;
  };
}

interface AcceptAffiliateTermsResponse {
  acceptAffiliateTerms: {
    success: boolean;
    message: string;
    consent: AffiliateTermsConsent | null;
    affiliateProfile: AffiliateProfile | null;
  };
}

interface UpdateAffiliateBrandImageResponse {
  updateAffiliateBrandImage: {
    success: boolean;
    message: string;
    affiliateProfile: AffiliateProfile | null;
  };
}

interface ConvertAffiliateCreditsResponse {
  convertAffiliateCredits: {
    success: boolean;
    message: string;
    conversion: AffiliateConversion | null;
  };
}

interface AffiliateProfileResponse {
  affiliateProfile: AffiliateProfile | null;
}

interface AffiliateLandingResponse {
  affiliateLanding: AffiliateLanding;
}

interface AffiliateStatsResponse {
  myAffiliateStats: AffiliateStats | null;
}

interface AffiliateCreditsResponse {
  myAffiliateCredits: AffiliateCredit[];
}

interface AffiliateConversionsResponse {
  myAffiliateConversions: AffiliateConversion[];
}

interface AffiliateRelationshipResponse {
  myAffiliateRelationship: AffiliateRelationship | null;
}

interface PolicyAcceptancesResponse {
  myPolicyAcceptances: PolicyAcceptance[];
}

interface AffiliateCodeChangeInfoResponse {
  myCodeChangeInfo: AffiliateCodeChangeInfo | null;
}

interface AffiliateCodeHistoryResponse {
  myCodeHistory: AffiliateCodeHistory[];
}

interface AffiliateCodeChangeRequestsResponse {
  myCodeChangeRequests: AffiliateCodeChangeRequest[];
}

interface CheckCodeAvailabilityResponse {
  checkCodeAvailability: {
    success: boolean;
    message: string;
    available: boolean;
    requiresReview: boolean;
  };
}

interface RequestCodeChangeResponse {
  requestCodeChange: {
    success: boolean;
    message: string;
    requestId: string | null;
    requiresReview: boolean;
  };
}

interface CancelCodeChangeRequestResponse {
  cancelCodeChangeRequest: {
    success: boolean;
    message: string;
    codeChangeRequest: AffiliateCodeChangeRequest | null;
  };
}

interface ApproveCodeChangeRequestResponse {
  approveCodeChangeRequest: {
    success: boolean;
    message: string;
    codeChangeRequest: AffiliateCodeChangeRequest | null;
  };
}

interface RejectCodeChangeRequestResponse {
  rejectCodeChangeRequest: {
    success: boolean;
    message: string;
    codeChangeRequest: AffiliateCodeChangeRequest | null;
  };
}

export interface PendingCodeChangeRequest extends AffiliateCodeChangeRequest {
  user: PublicUser;
  userReferralCount: number;
  profileCreatedAt: string;
}

interface PendingCodeChangeRequestsResponse {
  pendingCodeChangeRequests: PendingCodeChangeRequest[];
}

interface AffiliateEligibilityResponse {
  affiliateProgramEligibility: AffiliateEligibility;
}

interface CreateStripeConnectAccountResponse {
  createStripeConnectAccount: {
    success: boolean;
    message: string;
    onboardingUrl?: string;
    affiliateProfile?: AffiliateProfile | null;
  };
}

interface RefreshStripeAccountStatusResponse {
  refreshStripeAccountStatus: {
    success: boolean;
    message: string;
    affiliateProfile?: AffiliateProfile | null;
  };
}

interface GetStripeDashboardLinkResponse {
  getStripeDashboardLink: {
    success: boolean;
    message: string;
    dashboardUrl?: string;
  };
}

export interface PayoutConversion {
  uuid: string;
  affiliate: {
    uuid: string;
    username: string;
    affiliateProfile?: {
      code: string;
      stripeAccountId: string | null;
      stripeOnboardingCompleted: boolean;
      stripePayoutsEnabled: boolean;
      stripeCountry: string | null;
    };
  };
  conversionType: string;
  affiliateCreditAmount: number;
  targetAmount: number;
  status: string;
  stripePayoutId?: string | null;
  stripeTransferId?: string | null;
  rejectionReason?: string | null;
  adminNotes?: string | null;
  reviewedBy?: PublicUser | null;
  reviewedAt?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface AllPayoutConversionsResponse {
  allPayoutConversions: PayoutConversion[];
}

interface PayoutConversionByIdResponse {
  payoutConversionById: PayoutConversion | null;
}

interface ApprovePayoutRequestResponse {
  approvePayoutRequest: {
    success: boolean;
    message: string;
    conversion: PayoutConversion | null;
  };
}

interface RejectPayoutRequestResponse {
  rejectPayoutRequest: {
    success: boolean;
    message: string;
    conversion: PayoutConversion | null;
  };
}

export interface AffiliateUserSearchResult {
  uuid: string;
  username: string;
  affiliateCode?: string;
  hasAffiliateProfile: boolean;
  eligibilityStatus: string;
  isActive?: boolean;
  stripeAccountId?: string;
  stripeOnboardingCompleted?: boolean;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeCountry?: string;
  stripeDetailsSubmitted?: boolean;
}

export interface PlatformFinancialStats {
  stripeAvailableBalanceCents: number;
  stripePendingBalanceCents: number;
  stripeTotalBalanceCents: number;
  stripeCurrency: string;
  stripeIsLiveMode: boolean;
  totalAffiliateCredits: number;
  totalAffiliateCreditsCents: number;
  totalAffiliateCreditsDollars: number;
  pendingConversionCredits: number;
  pendingConversionCents: number;
  availablePayoutBufferCents: number;
  canCoverAllOutstanding: boolean;
}

export interface ExportAffiliateGraphResponse {
  success: boolean;
  message: string | null;
  graphData: string | null;
  format: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AffiliateService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  /**
   * Get public affiliate landing page data
   * PUBLIC QUERY - Does not require authentication
   * Used by /a/:code route which is accessible without login
   */
  getAffiliateLanding(affiliateCode: string): Observable<AffiliateLanding> {
    const query = gql`
      query GetAffiliateLanding($affiliateCode: String!) {
        affiliateLanding(affiliateCode: $affiliateCode) {
          affiliateCode
          affiliateUsername
          brandImageUrl
          customMessage
        }
      }
    `;

    return this.query<AffiliateLandingResponse>({
      query,
      variables: { affiliateCode },
      fetchPolicy: 'no-cache', // Don't cache public queries
      errorPolicy: 'all', // Return both data and errors
    }).pipe(map((data) => data.affiliateLanding));
  }

  checkAffiliateProgramEligibility(): Observable<AffiliateEligibility> {
    const query = gql`
      query CheckAffiliateProgramEligibility {
        affiliateProgramEligibility {
          isEligible
          reason
          hasPaidOrder
        }
      }
    `;

    return this.query<AffiliateEligibilityResponse>({
      query,
    }).pipe(map((data) => data.affiliateProgramEligibility));
  }

  joinAffiliateProgram(affiliateCode: string): Observable<{
    success: boolean;
    message: string;
    relationship: AffiliateRelationship | null;
  }> {
    const mutation = gql`
      mutation JoinAffiliateProgram($affiliateCode: String!) {
        joinAffiliateProgram(affiliateCode: $affiliateCode) {
          success
          message
          relationship {
            uuid
            tier
            affiliate {
              uuid
              username
            }
            referredUser {
              uuid
              username
            }
            referredUserHasAffiliateProfile
            createdAt
          }
        }
      }
    `;

    return this.mutate<JoinAffiliateProgramResponse>({
      mutation,
      variables: { affiliateCode },
    }).pipe(
      map((data) => {
        if (!data.joinAffiliateProgram.success) {
          throw new Error(data.joinAffiliateProgram.message);
        }
        return data.joinAffiliateProgram;
      }),
    );
  }

  acceptAffiliateTerms(version: string): Observable<{
    success: boolean;
    message: string;
    consent: AffiliateTermsConsent | null;
    affiliateProfile: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation AcceptAffiliateTerms($version: String!) {
        acceptAffiliateTerms(version: $version) {
          success
          message
          consent {
            version
            accepted
            date
          }
          affiliateProfile {
            uuid
            user {
              uuid
              username
            }
            code
            brandImageUrl
            isActive
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<AcceptAffiliateTermsResponse>({
      mutation,
      variables: { version },
    }).pipe(
      map((data) => {
        if (!data.acceptAffiliateTerms.success) {
          throw new Error(data.acceptAffiliateTerms.message);
        }
        return data.acceptAffiliateTerms;
      }),
    );
  }

  createStripeConnectAccount(): Observable<{
    success: boolean;
    message: string;
    onboardingUrl?: string;
    affiliateProfile?: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation CreateStripeConnectAccount {
        createStripeConnectAccount {
          success
          message
          onboardingUrl
          affiliateProfile {
            uuid
            stripeAccountId
            stripeOnboardingCompleted
            stripePayoutsEnabled
            stripeCountry
          }
        }
      }
    `;

    return this.mutate<CreateStripeConnectAccountResponse>({
      mutation,
    }).pipe(
      map((data) => {
        if (!data.createStripeConnectAccount.success) {
          throw new Error(data.createStripeConnectAccount.message);
        }
        return data.createStripeConnectAccount;
      }),
    );
  }

  refreshStripeAccountStatus(): Observable<{
    success: boolean;
    message: string;
    affiliateProfile?: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation RefreshStripeAccountStatus {
        refreshStripeAccountStatus {
          success
          message
          affiliateProfile {
            uuid
            stripeAccountId
            stripeOnboardingCompleted
            stripeChargesEnabled
            stripePayoutsEnabled
            stripeCountry
            stripeDetailsSubmitted
          }
        }
      }
    `;

    return this.mutate<RefreshStripeAccountStatusResponse>({
      mutation,
    }).pipe(
      map((data) => {
        if (!data.refreshStripeAccountStatus.success) {
          throw new Error(data.refreshStripeAccountStatus.message);
        }
        return data.refreshStripeAccountStatus;
      }),
    );
  }

  getStripeDashboardLink(): Observable<{
    success: boolean;
    message: string;
    dashboardUrl?: string;
  }> {
    const mutation = gql`
      mutation GetStripeDashboardLink {
        getStripeDashboardLink {
          success
          message
          dashboardUrl
        }
      }
    `;

    return this.mutate<GetStripeDashboardLinkResponse>({
      mutation,
    }).pipe(
      map((data) => {
        if (!data.getStripeDashboardLink.success) {
          throw new Error(data.getStripeDashboardLink.message);
        }
        return data.getStripeDashboardLink;
      }),
    );
  }

  updateAffiliateBrandImage(file: File): Observable<{
    success: boolean;
    message: string;
    affiliateProfile: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation UpdateAffiliateBrandImage($image: Upload!, $deleteImage: Boolean) {
        updateAffiliateBrandImage(image: $image, deleteImage: $deleteImage) {
          success
          message
          affiliateProfile {
            uuid
            user {
              uuid
              username
            }
            code
            brandImageUrl
            isActive
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<UpdateAffiliateBrandImageResponse>({
      mutation,
      variables: { image: file, deleteImage: false },
      context: {
        useMultipart: true,
      },
    }).pipe(
      map((data) => {
        if (!data.updateAffiliateBrandImage.success) {
          throw new Error(data.updateAffiliateBrandImage.message);
        }
        return data.updateAffiliateBrandImage;
      }),
    );
  }

  deleteAffiliateBrandImage(): Observable<{
    success: boolean;
    message: string;
    affiliateProfile: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation DeleteAffiliateBrandImage($deleteImage: Boolean!) {
        updateAffiliateBrandImage(deleteImage: $deleteImage) {
          success
          message
          affiliateProfile {
            uuid
            user {
              uuid
              username
            }
            code
            brandImageUrl
            isActive
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<UpdateAffiliateBrandImageResponse>({
      mutation,
      variables: { deleteImage: true },
      context: {
        useMultipart: true,
      },
    }).pipe(
      map((data) => {
        if (!data.updateAffiliateBrandImage.success) {
          throw new Error(data.updateAffiliateBrandImage.message);
        }
        return data.updateAffiliateBrandImage;
      }),
    );
  }

  convertAffiliateCredits(
    conversionType: 'to_credits' | 'to_cash',
    amount: number,
  ): Observable<{
    success: boolean;
    message: string;
    conversion: AffiliateConversion | null;
  }> {
    const mutation = gql`
      mutation ConvertAffiliateCredits($conversionType: String!, $amount: Int!) {
        convertAffiliateCredits(conversionType: $conversionType, amount: $amount) {
          success
          message
          conversion {
            uuid
            conversionType
            affiliateCreditAmount
            targetAmount
            status
            stripeTransferId
            rejectionReason
            createdAt
            completedAt
          }
        }
      }
    `;

    return this.mutate<ConvertAffiliateCreditsResponse>({
      mutation,
      variables: { conversionType, amount },
    }).pipe(
      map((data) => {
        if (!data.convertAffiliateCredits.success) {
          throw new Error(data.convertAffiliateCredits.message);
        }
        return data.convertAffiliateCredits;
      }),
    );
  }

  getAffiliateProfile(): Observable<AffiliateProfile | null> {
    const query = gql`
      query GetAffiliateProfile {
        affiliateProfile {
          uuid
          user {
            uuid
            username
          }
          code
          brandImageUrl
          customMessage
          isActive
          eligibilityStatus
          eligibilityMessage
          stripeAccountId
          stripeOnboardingCompleted
          stripeChargesEnabled
          stripePayoutsEnabled
          stripeCountry
          stripeDetailsSubmitted
          createdAt
          updatedAt
        }
      }
    `;

    return this.query<AffiliateProfileResponse>({
      query,
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.affiliateProfile));
  }

  /**
   * Update affiliate profile settings
   * Allows affiliates to set their custom landing page message
   */
  updateAffiliateProfile(customMessage: string | null): Observable<{
    success: boolean;
    message: string;
    affiliateProfile: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation UpdateAffiliateProfile($customMessage: String) {
        updateAffiliateProfile(customMessage: $customMessage) {
          success
          message
          affiliateProfile {
            uuid
            user {
              uuid
              username
            }
            code
            brandImageUrl
            customMessage
            isActive
            createdAt
            updatedAt
          }
        }
      }
    `;

    interface Response {
      updateAffiliateProfile: {
        success: boolean;
        message: string;
        affiliateProfile: AffiliateProfile | null;
      };
    }

    return this.mutate<Response>({
      mutation,
      variables: { customMessage }, // Pass as-is, empty string clears the message
      fetchPolicy: 'no-cache',
    }).pipe(
      map((data) => {
        if (!data.updateAffiliateProfile.success) {
          throw new Error(data.updateAffiliateProfile.message);
        }
        return data.updateAffiliateProfile;
      }),
    );
  }

  getAffiliateStats(): Observable<AffiliateStats | null> {
    const query = gql`
      query GetAffiliateStats {
        myAffiliateStats {
          totalAffiliateCredits
          totalReferrals
          tier1Referrals
          tier2Referrals
        }
      }
    `;

    return this.query<AffiliateStatsResponse>({
      query,
    }).pipe(map((data) => data.myAffiliateStats));
  }

  getAffiliateCredits(): Observable<AffiliateCredit[]> {
    const query = gql`
      query GetAffiliateCredits {
        myAffiliateCredits {
          uuid
          amount
          tier
          sourceUser {
            uuid
            username
          }
          description
          createdAt
        }
      }
    `;

    return this.query<AffiliateCreditsResponse>({
      query,
    }).pipe(map((data) => data.myAffiliateCredits));
  }

  getAffiliateConversions(): Observable<AffiliateConversion[]> {
    const query = gql`
      query GetAffiliateConversions {
        myAffiliateConversions {
          uuid
          conversionType
          affiliateCreditAmount
          targetAmount
          status
          stripeTransferId
          rejectionReason
          createdAt
          completedAt
        }
      }
    `;

    return this.query<AffiliateConversionsResponse>({
      query,
    }).pipe(map((data) => data.myAffiliateConversions));
  }

  getMyAffiliateRelationship(): Observable<AffiliateRelationship | null> {
    const query = gql`
      query GetMyAffiliateRelationship {
        myAffiliateRelationship {
          uuid
          tier
          affiliate {
            uuid
            username
          }
          referredUser {
            uuid
            username
          }
          referredUserHasAffiliateProfile
          createdAt
        }
      }
    `;

    return this.query<AffiliateRelationshipResponse>({
      query,
    }).pipe(map((data) => data.myAffiliateRelationship));
  }

  getAffiliateTermsConsents(): Observable<AffiliateTermsConsent[]> {
    // DEPRECATED: Use checkAffiliateTermsAcceptance() instead
    // This method is kept for backward compatibility but will be removed
    return this.checkAffiliateTermsAcceptance().pipe(
      map((hasAccepted) => {
        // Convert new format to old format for compatibility
        return hasAccepted ? [{ version: '1.0', accepted: true, date: new Date().toISOString() }] : [];
      }),
    );
  }

  /**
   * Check if user has accepted the current version of affiliate terms
   * @returns Observable<boolean> - true if the current version has been accepted
   */
  checkAffiliateTermsAcceptance(): Observable<boolean> {
    const ACTIVE_POLICIES_QUERY = gql`
      query ActivePoliciesMetadata {
        activePolicies {
          id
          policyType
          version
        }
      }
    `;

    const ACCEPTANCES_QUERY = gql`
      query CheckAffiliateTermsAcceptance {
        myPolicyAcceptances {
          id
          policy {
            id
            policyType
            version
          }
          acceptedAt
        }
      }
    `;

    interface ActivePoliciesResponse {
      activePolicies: {
        id: string;
        policyType: string;
        version: string;
      }[];
    }

    return forkJoin({
      activePolicies: this.query<ActivePoliciesResponse>({
        query: ACTIVE_POLICIES_QUERY,
        fetchPolicy: 'network-only',
      }),
      acceptances: this.query<PolicyAcceptancesResponse>({
        query: ACCEPTANCES_QUERY,
        fetchPolicy: 'network-only',
      }),
    }).pipe(
      map(({ activePolicies, acceptances }) => {
        // Find the current active affiliate terms version
        const activeAffiliateTerms = activePolicies.activePolicies.find(
          (policy) => policy.policyType === 'AFFILIATE_TERMS',
        );

        if (!activeAffiliateTerms) {
          // No active affiliate terms policy exists
          return false;
        }

        // Check if user has accepted the current version
        const acceptance = acceptances.myPolicyAcceptances.find((a) => a.policy.policyType === 'AFFILIATE_TERMS');

        return acceptance?.policy.version === activeAffiliateTerms.version;
      }),
    );
  }

  getAffiliateByCode(code: string): Observable<AffiliateProfile> {
    const query = gql`
      query GetAffiliateByCode($code: String!) {
        affiliateByCode(code: $code) {
          uuid
          user {
            uuid
            username
          }
          code
          brandImageUrl
          isActive
          createdAt
          updatedAt
        }
      }
    `;

    interface GetAffiliateByCodeResponse {
      affiliateByCode: AffiliateProfile;
    }

    return this.query<GetAffiliateByCodeResponse>({
      query,
      variables: { code },
    }).pipe(map((data) => data.affiliateByCode));
  }

  getCodeChangeInfo(): Observable<AffiliateCodeChangeInfo | null> {
    const query = gql`
      query GetCodeChangeInfo {
        myCodeChangeInfo {
          canChange
          daysUntilNextChange
          changeCount
          lastChangeDate
        }
      }
    `;

    return this.query<AffiliateCodeChangeInfoResponse>({
      query,
    }).pipe(map((data) => data.myCodeChangeInfo));
  }

  getCodeHistory(): Observable<AffiliateCodeHistory[]> {
    const query = gql`
      query GetCodeHistory {
        myCodeHistory {
          uuid
          oldCode
          newCode
          changedAt
          reason
        }
      }
    `;

    return this.query<AffiliateCodeHistoryResponse>({
      query,
    }).pipe(map((data) => data.myCodeHistory));
  }

  getCodeChangeRequests(): Observable<AffiliateCodeChangeRequest[]> {
    const query = gql`
      query GetCodeChangeRequests {
        myCodeChangeRequests {
          uuid
          requestedCode
          currentCode
          status
          reason
          rejectionReason
          requestedAt
          reviewedAt
        }
      }
    `;

    return this.query<AffiliateCodeChangeRequestsResponse>({
      query,
    }).pipe(map((data) => data.myCodeChangeRequests));
  }

  checkCodeAvailability(code: string): Observable<{
    success: boolean;
    message: string;
    available: boolean;
    requiresReview: boolean;
  }> {
    const mutation = gql`
      mutation CheckCodeAvailability($code: String!) {
        checkCodeAvailability(code: $code) {
          success
          message
          available
          requiresReview
        }
      }
    `;

    return this.mutate<CheckCodeAvailabilityResponse>({
      mutation,
      variables: { code },
    }).pipe(map((data) => data.checkCodeAvailability));
  }

  requestCodeChange(
    newCode: string,
    reason?: string,
  ): Observable<{
    success: boolean;
    message: string;
    requestId: string | null;
    requiresReview: boolean;
  }> {
    const mutation = gql`
      mutation RequestCodeChange($newCode: String!, $reason: String) {
        requestCodeChange(newCode: $newCode, reason: $reason) {
          success
          message
          requestId
          requiresReview
        }
      }
    `;

    return this.mutate<RequestCodeChangeResponse>({
      mutation,
      variables: { newCode, reason },
    }).pipe(
      map((data) => {
        if (!data.requestCodeChange.success) {
          throw new Error(data.requestCodeChange.message);
        }
        return data.requestCodeChange;
      }),
    );
  }

  cancelCodeChangeRequest(requestId: string): Observable<{
    success: boolean;
    message: string;
    codeChangeRequest: AffiliateCodeChangeRequest | null;
  }> {
    const mutation = gql`
      mutation CancelCodeChangeRequest($requestId: UUID!) {
        cancelCodeChangeRequest(requestId: $requestId) {
          success
          message
          codeChangeRequest {
            uuid
            status
            rejectionReason
          }
        }
      }
    `;

    return this.mutate<CancelCodeChangeRequestResponse>({
      mutation,
      variables: { requestId },
    }).pipe(
      map((data) => {
        if (!data.cancelCodeChangeRequest.success) {
          throw new Error(data.cancelCodeChangeRequest.message);
        }
        return data.cancelCodeChangeRequest;
      }),
    );
  }

  getPendingCodeChangeRequests(): Observable<PendingCodeChangeRequest[]> {
    const query = gql`
      query PendingCodeChangeRequests {
        pendingCodeChangeRequests {
          uuid
          user {
            uuid
            username
          }
          currentCode
          requestedCode
          reason
          requestedAt
          userReferralCount
          profileCreatedAt
          status
          rejectionReason
          reviewedAt
        }
      }
    `;

    return this.query<PendingCodeChangeRequestsResponse>({
      query,
    }).pipe(map((data) => data.pendingCodeChangeRequests));
  }

  approveCodeChangeRequest(requestId: string): Observable<{
    success: boolean;
    message: string;
    codeChangeRequest: AffiliateCodeChangeRequest | null;
  }> {
    const mutation = gql`
      mutation ApproveCodeChangeRequest($requestId: UUID!) {
        approveCodeChangeRequest(requestId: $requestId) {
          success
          message
          codeChangeRequest {
            uuid
            status
            requestedCode
          }
        }
      }
    `;

    return this.mutate<ApproveCodeChangeRequestResponse>({
      mutation,
      variables: { requestId },
    }).pipe(
      map((data) => {
        if (!data.approveCodeChangeRequest.success) {
          throw new Error(data.approveCodeChangeRequest.message);
        }
        return data.approveCodeChangeRequest;
      }),
    );
  }

  rejectCodeChangeRequest(
    requestId: string,
    rejectionReason?: string,
  ): Observable<{
    success: boolean;
    message: string;
    codeChangeRequest: AffiliateCodeChangeRequest | null;
  }> {
    const mutation = gql`
      mutation RejectCodeChangeRequest($requestId: UUID!, $rejectionReason: String) {
        rejectCodeChangeRequest(requestId: $requestId, rejectionReason: $rejectionReason) {
          success
          message
          codeChangeRequest {
            uuid
            status
            rejectionReason
          }
        }
      }
    `;

    return this.mutate<RejectCodeChangeRequestResponse>({
      mutation,
      variables: { requestId, rejectionReason },
    }).pipe(
      map((data) => {
        if (!data.rejectCodeChangeRequest.success) {
          throw new Error(data.rejectCodeChangeRequest.message);
        }
        return data.rejectCodeChangeRequest;
      }),
    );
  }

  getAffiliateProgramSettings(): Observable<{ isEnabled: boolean; disabledMessage: string }> {
    const query = gql`
      query GetAffiliateSystemSettings {
        affiliateSystemSettings {
          isEnabled
          disabledMessage
        }
      }
    `;

    interface Response {
      affiliateSystemSettings: { isEnabled: boolean; disabledMessage: string };
    }

    return this.query<Response>({
      query,
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.affiliateSystemSettings));
  }

  searchAffiliateUsers(query: string): Observable<AffiliateUserSearchResult[]> {
    const searchQuery = gql`
      query SearchAffiliateUsers($query: String!) {
        searchAffiliateUsers(query: $query) {
          uuid
          username
          affiliateCode
          hasAffiliateProfile
          eligibilityStatus
          isActive
          stripeAccountId
          stripeOnboardingCompleted
          stripeChargesEnabled
          stripePayoutsEnabled
          stripeCountry
          stripeDetailsSubmitted
        }
      }
    `;

    interface Response {
      searchAffiliateUsers: AffiliateUserSearchResult[];
    }

    return this.query<Response>({
      query: searchQuery,
      variables: { query },
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.searchAffiliateUsers));
  }

  updateAffiliateEligibility(
    userId: string,
    eligibilityStatus: string,
    eligibilityMessage?: string,
    reason?: string,
  ): Observable<{ success: boolean; message: string; affiliateProfile: AffiliateProfile | null }> {
    const mutation = gql`
      mutation UpdateAffiliateEligibility(
        $userId: UUID!
        $eligibilityStatus: String!
        $eligibilityMessage: String
        $reason: String
      ) {
        updateAffiliateEligibility(
          userId: $userId
          eligibilityStatus: $eligibilityStatus
          eligibilityMessage: $eligibilityMessage
          reason: $reason
        ) {
          success
          message
          affiliateProfile {
            uuid
            eligibilityStatus
            eligibilityMessage
          }
        }
      }
    `;

    interface Response {
      updateAffiliateEligibility: {
        success: boolean;
        message: string;
        affiliateProfile: AffiliateProfile | null;
      };
    }

    return this.mutate<Response>({
      mutation,
      variables: { userId, eligibilityStatus, eligibilityMessage, reason },
    }).pipe(
      map((data) => {
        if (!data.updateAffiliateEligibility.success) {
          throw new Error(data.updateAffiliateEligibility.message);
        }
        return data.updateAffiliateEligibility;
      }),
    );
  }

  updateAffiliateNetworkStatus(
    userId: string,
    isActive: boolean,
    reason?: string,
  ): Observable<{ success: boolean; message: string; affiliateProfile: AffiliateProfile | null }> {
    const mutation = gql`
      mutation UpdateAffiliateNetworkStatus($userId: UUID!, $isActive: Boolean!, $reason: String) {
        updateAffiliateNetworkStatus(userId: $userId, isActive: $isActive, reason: $reason) {
          success
          message
          affiliateProfile {
            uuid
            isActive
            eligibilityStatus
            eligibilityMessage
          }
        }
      }
    `;

    interface Response {
      updateAffiliateNetworkStatus: {
        success: boolean;
        message: string;
        affiliateProfile: AffiliateProfile | null;
      };
    }

    return this.mutate<Response>({
      mutation,
      variables: { userId, isActive, reason },
    }).pipe(
      map((data) => {
        if (!data.updateAffiliateNetworkStatus.success) {
          throw new Error(data.updateAffiliateNetworkStatus.message);
        }
        return data.updateAffiliateNetworkStatus;
      }),
    );
  }

  updateAffiliateProgramEnabled(
    isEnabled: boolean,
    disabledMessage?: string,
    reason?: string,
  ): Observable<{ success: boolean; message: string }> {
    const mutation = gql`
      mutation UpdateAffiliateSystemSettings($isEnabled: Boolean!, $disabledMessage: String, $reason: String) {
        updateAffiliateSystemSettings(isEnabled: $isEnabled, disabledMessage: $disabledMessage, reason: $reason) {
          success
          message
        }
      }
    `;

    interface Response {
      updateAffiliateSystemSettings: { success: boolean; message: string };
    }

    return this.mutate<Response>({
      mutation,
      variables: { isEnabled, disabledMessage, reason },
    }).pipe(
      map((data) => {
        if (!data.updateAffiliateSystemSettings.success) {
          throw new Error(data.updateAffiliateSystemSettings.message);
        }
        return data.updateAffiliateSystemSettings;
      }),
    );
  }

  getAllPayoutConversions(status?: string, conversionType?: string, limit?: number): Observable<PayoutConversion[]> {
    const query = gql`
      query GetPayoutConversions($status: String, $conversionType: String, $limit: Int) {
        allPayoutConversions(status: $status, conversionType: $conversionType, limit: $limit) {
          uuid
          affiliate {
            uuid
            username
          }
          conversionType
          affiliateCreditAmount
          targetAmount
          status
          stripePayoutId
          stripeTransferId
          rejectionReason
          adminNotes
          reviewedBy {
            uuid
            username
          }
          reviewedAt
          createdAt
          completedAt
        }
      }
    `;

    return this.query<AllPayoutConversionsResponse>({
      query,
      variables: { status, conversionType, limit },
    }).pipe(map((data) => data.allPayoutConversions));
  }

  getPayoutConversionById(conversionId: string): Observable<PayoutConversion | null> {
    const query = gql`
      query GetPayoutById($conversionId: UUID!) {
        payoutConversionById(conversionId: $conversionId) {
          uuid
          affiliate {
            uuid
            username
            affiliateProfile {
              code
              stripeAccountId
              stripeOnboardingCompleted
              stripePayoutsEnabled
              stripeCountry
            }
          }
          conversionType
          affiliateCreditAmount
          targetAmount
          status
          stripePayoutId
          stripeTransferId
          rejectionReason
          adminNotes
          reviewedBy {
            uuid
            username
          }
          reviewedAt
          createdAt
          completedAt
        }
      }
    `;

    return this.query<PayoutConversionByIdResponse>({
      query,
      variables: { conversionId },
    }).pipe(map((data) => data.payoutConversionById));
  }

  approvePayoutRequest(
    conversionId: string,
    adminNotes?: string,
  ): Observable<{
    success: boolean;
    message: string;
    conversion: PayoutConversion | null;
  }> {
    const mutation = gql`
      mutation ApprovePayoutRequest($conversionId: UUID!, $adminNotes: String) {
        approvePayoutRequest(conversionId: $conversionId, adminNotes: $adminNotes) {
          success
          message
          conversion {
            uuid
            status
            stripeTransferId
            completedAt
            reviewedBy {
              uuid
              username
            }
          }
        }
      }
    `;

    return this.mutate<ApprovePayoutRequestResponse>({
      mutation,
      variables: { conversionId, adminNotes },
    }).pipe(
      map((data) => {
        if (!data.approvePayoutRequest.success) {
          throw new Error(data.approvePayoutRequest.message);
        }
        return data.approvePayoutRequest;
      }),
    );
  }

  rejectPayoutRequest(
    conversionId: string,
    rejectionReason: string,
    adminNotes?: string,
  ): Observable<{
    success: boolean;
    message: string;
    conversion: PayoutConversion | null;
  }> {
    const mutation = gql`
      mutation RejectPayoutRequest($conversionId: UUID!, $rejectionReason: String!, $adminNotes: String) {
        rejectPayoutRequest(conversionId: $conversionId, rejectionReason: $rejectionReason, adminNotes: $adminNotes) {
          success
          message
          conversion {
            uuid
            status
            rejectionReason
            reviewedBy {
              uuid
              username
            }
          }
        }
      }
    `;

    return this.mutate<RejectPayoutRequestResponse>({
      mutation,
      variables: { conversionId, rejectionReason, adminNotes },
    }).pipe(
      map((data) => {
        if (!data.rejectPayoutRequest.success) {
          throw new Error(data.rejectPayoutRequest.message);
        }
        return data.rejectPayoutRequest;
      }),
    );
  }

  getPlatformFinancialStats(): Observable<PlatformFinancialStats> {
    const query = gql`
      query PlatformFinancialStats {
        platformFinancialStats {
          stripeAvailableBalanceCents
          stripePendingBalanceCents
          stripeTotalBalanceCents
          stripeCurrency
          stripeIsLiveMode
          totalAffiliateCredits
          totalAffiliateCreditsCents
          totalAffiliateCreditsDollars
          pendingConversionCredits
          pendingConversionCents
          availablePayoutBufferCents
          canCoverAllOutstanding
        }
      }
    `;

    interface Response {
      platformFinancialStats: PlatformFinancialStats;
    }

    return this.query<Response>({
      query,
      fetchPolicy: 'network-only', // Always get fresh data
    }).pipe(map((data) => data.platformFinancialStats));
  }

  exportAffiliateGraph(format = 'mermaid'): Observable<ExportAffiliateGraphResponse> {
    const mutation = gql`
      mutation ExportAffiliateGraph($format: String) {
        exportAffiliateGraph(format: $format) {
          success
          message
          graphData
          format
        }
      }
    `;

    interface Response {
      exportAffiliateGraph: ExportAffiliateGraphResponse;
    }

    return this.mutate<Response>({
      mutation,
      variables: { format },
    }).pipe(map((data) => data.exportAffiliateGraph));
  }
}
