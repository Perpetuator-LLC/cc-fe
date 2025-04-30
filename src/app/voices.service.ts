// Copyright (c) 2025 Perpetuator LLC

import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { PageInfo, RelayEdge } from './utils/relay';

export enum VoiceTier {
  PREMIUM_HD = 'PREMIUM_HD',
  PREMIUM = 'PREMIUM',
  REGULAR_HD = 'REGULAR_HD',
  REGULAR = 'REGULAR',
  REGULAR_LD = 'REGULAR_LD',
}

export const stringToVoiceTier = (tier: string) => {
  switch (tier.toUpperCase()) {
    case 'PREMIUM_HD':
      return VoiceTier.PREMIUM_HD;
    case 'PREMIUM':
      return VoiceTier.PREMIUM;
    case 'REGULAR_HD':
      return VoiceTier.REGULAR_HD;
    case 'REGULAR':
      return VoiceTier.REGULAR;
    case 'REGULAR_LD':
      return VoiceTier.REGULAR_LD;
    default:
      throw new Error('Invalid voice tier');
  }
};

export const tierToString = (tier: string) => {
  switch (tier.toUpperCase()) {
    case VoiceTier.PREMIUM_HD:
      return 'Premium HD';
    case VoiceTier.PREMIUM:
      return 'Premium';
    case VoiceTier.REGULAR_HD:
      return 'Regular HD';
    case VoiceTier.REGULAR:
      return 'Regular';
    case VoiceTier.REGULAR_LD:
      return 'Regular LD';
    default:
      return 'N/A';
  }
};

export interface Voice {
  id: string;
  uuid: string;
  provider: string;
  enabled: boolean;
  modelName: string;
  externalId: string;
  tier: string;
  creditsPerMillionChar: number;
  displayName: string | null;
  sampleUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const GET_VOICES = gql`
  query GetVoices($tiers: [VoiceTier!], $enabled: Boolean) {
    voices(tiers: $tiers, enabled: $enabled) {
      edges {
        node {
          id
          uuid
          provider
          enabled
          modelName
          tier
          creditsPerMillionChar
          externalId
          displayName
          sampleUrl
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

@Injectable({
  providedIn: 'root',
})
export class VoicesService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  getVoices(tiers?: VoiceTier[], enabled?: boolean) {
    interface Response {
      voices: {
        edges: RelayEdge<Voice>[];
        pageInfo: PageInfo;
      };
    }
    // if (tiers || enabled !== undefined) {
    //   queryOptions.variables = {};
    //   if (tiers && tiers.length > 0) queryOptions.variables.tiers = tiers;
    //   if (enabled !== undefined) queryOptions.variables.enabled = enabled;
    // }
    //
    // return this.query<Response>(queryOptions).pipe(
    //   map(({ voices }) => ({
    //     voices: voices.edges.map((edge) => edge.node),
    //     pageInfo: voices.pageInfo,
    //   })),
    // );
    return this.query<Response>({
      query: GET_VOICES,
      variables: { tiers, enabled },
      // fetchPolicy: 'cache-and-network', // Or your preferred policy
    }).pipe(
      // map((result) => result.data.voices.edges.map((edge) => edge.node))
      map(({ voices }) => ({
        voices: voices.edges.map((edge) => edge.node),
        pageInfo: voices.pageInfo,
      })),
    );
  }
}
