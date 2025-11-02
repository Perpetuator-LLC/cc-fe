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
  brandImage: string | null;
  isActive: boolean;
  createdAt: string;
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
            brandImage
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

  updateAffiliateBrandImage(image: string): Observable<{
    success: boolean;
    message: string;
    affiliateProfile: AffiliateProfile | null;
  }> {
    const mutation = gql`
      mutation UpdateAffiliateBrandImage($image: String!) {
        updateAffiliateBrandImage(image: $image) {
          success
          message
          affiliateProfile {
            code
            brandImage
            isActive
            createdAt
          }
        }
      }
    `;

    return this.mutate<UpdateAffiliateBrandImageResponse>({
      mutation,
      variables: { image },
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
          brandImage
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
}
