// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import gql from 'graphql-tag';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';

export interface AffiliateProfile {
  code: string;
  brandImageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  username?: string;
}

export interface AffiliateRelationship {
  affiliateUsername: string;
  tier: number;
  createdAt: string;
}

export interface AffiliateStats {
  totalAffiliateCredits: number;
  totalReferrals: number;
  tier1Referrals: number;
  tier2Referrals: number;
}

export interface AffiliateCredit {
  amount: number;
  tier: number;
  sourceUsername: string;
  description: string;
  createdAt: string;
}

export interface AffiliateConversion {
  conversionType: string;
  affiliateCreditAmount: number;
  targetAmount: number;
  status: string;
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

export interface AffiliateCodeChangeRequest {
  uuid: string;
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
            affiliateUsername
            tier
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
            code
            isActive
            brandImageUrl
            createdAt
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
            code
            brandImageUrl
            isActive
            createdAt
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
            code
            brandImageUrl
            isActive
            createdAt
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
            conversionType
            affiliateCreditAmount
            targetAmount
            status
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
          code
          brandImageUrl
          isActive
          createdAt
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
          amount
          tier
          sourceUsername
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
          conversionType
          affiliateCreditAmount
          targetAmount
          status
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
          affiliateUsername
          tier
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
          code
          brandImageUrl
          isActive
          createdAt
          username
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
}
