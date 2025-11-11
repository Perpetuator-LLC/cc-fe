// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';

export interface PublicUser {
  uuid: string;
  username: string;
}

export interface AffiliateProfile {
  uuid: string;
  user: PublicUser;
  code: string;
  brandImageUrl: string | null;
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

interface AffiliateTermsConsentsResponse {
  myAffiliateTermsConsents: AffiliateTermsConsent[];
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

export interface AffiliateUserSearchResult {
  uuid: string;
  username: string;
  hasAffiliateProfile: boolean;
  eligibilityStatus: string;
  isActive?: boolean;
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
    }).pipe(map((data) => data.affiliateProfile));
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
    const query = gql`
      query GetAffiliateTermsConsents {
        myAffiliateTermsConsents {
          version
          accepted
          date
        }
      }
    `;

    return this.query<AffiliateTermsConsentsResponse>({
      query,
    }).pipe(map((data) => data.myAffiliateTermsConsents));
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
          hasAffiliateProfile
          eligibilityStatus
          isActive
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
}
