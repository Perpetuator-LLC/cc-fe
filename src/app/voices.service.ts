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

export const voiceToTier = (voice: Voice) => {
  if (voice.model === 'ELEVENLABS_MULTILINGUAL_V2') {
    return VoiceTier.PREMIUM_HD;
  } else if (voice.model === 'ELEVENLABS_FLASH_V2_5') {
    return VoiceTier.PREMIUM;
  } else if (voice.model === 'OPENAI_TTS_1_HD') {
    return VoiceTier.REGULAR_HD;
  } else if (voice.model === 'OPENAI_TTS_1') {
    return VoiceTier.REGULAR;
  } else if (voice.model === 'OPENAI_GPT_4O_MINI_TTS') {
    return VoiceTier.REGULAR_LD;
  }
  throw new Error('Invalid voice model');
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
  enabled: boolean;
  model: string;
  externalId: string;
  creditsPerMillionChar: number;
  displayName: string | null;
  sampleUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

const GET_VOICES = gql`
  query GetVoices($models: [VoiceModel!], $enabled: Boolean) {
    voices(models: $models, enabled: $enabled) {
      edges {
        node {
          id
          uuid
          enabled
          model
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

const REFRESH_VOICES = gql`
  mutation RefreshVoices(
    $forceMetadata: Boolean
    $forceSampleAudio: Boolean
    $models: [VoiceModel!]
    $externalIds: [String!]
  ) {
    refreshVoices(
      forceMetadata: $forceMetadata
      forceSampleAudio: $forceSampleAudio
      models: $models
      externalIds: $externalIds
    ) {
      success
      message
      addedVoices {
        id
        uuid
        displayName
        model
        externalId
        enabled
        sampleUrl
        # metadata # Consider if metadata is needed here
      }
      updatedVoices {
        id
        uuid
        displayName
        model
        externalId
        enabled
        sampleUrl
        # metadata # Consider if metadata is needed here
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

    // convert tiers to VoiceModel
    const models = tiers?.map((tier) => {
      switch (tier) {
        case VoiceTier.PREMIUM_HD:
          return 'ELEVENLABS_MULTILINGUAL_V2';
        // return 'eleven_multilingual_v2';
        case VoiceTier.PREMIUM:
          return 'ELEVENLABS_FLASH_V2_5';
        // return 'eleven_flash_v2_5';
        case VoiceTier.REGULAR_HD:
          return 'OPENAI_TTS_1_HD';
        // return 'tts-1-hd';
        case VoiceTier.REGULAR:
          return 'OPENAI_TTS_1';
        // return 'tts-1';
        case VoiceTier.REGULAR_LD:
          return 'OPENAI_GPT_4O_MINI_TTS';
        // return 'gpt-4o-mini-tts';
        default:
          throw new Error('Invalid voice tier');
      }
    });

    return this.query<Response>({
      query: GET_VOICES,
      variables: { models, enabled },
      // fetchPolicy: 'cache-and-network', // Or your preferred policy
    }).pipe(
      // map((result) => result.data.voices.edges.map((edge) => edge.node))
      map(({ voices }) => ({
        voices: voices.edges.map((edge) => edge.node),
        pageInfo: voices.pageInfo,
      })),
    );
  }

  createVoice(model: string, externalId: string, externalUserId?: string, displayName?: string) {
    const CREATE_VOICE = gql`
      mutation CreateVoice($model: VoiceModel!, $externalId: String!, $externalUserId: String, $displayName: String) {
        createVoice(
          model: $model
          externalId: $externalId
          externalUserId: $externalUserId
          displayName: $displayName
        ) {
          success
          message
          voice {
            id
            uuid
            displayName
            model
            externalId
            creditsPerMillionChar
            enabled
            sampleUrl
            createdAt
            updatedAt
          }
        }
      }
    `;

    interface Response {
      createVoice: {
        success: boolean;
        message: string;
        voice: Voice;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_VOICE,
      variables: { model, externalId, externalUserId, displayName },
    }).pipe(
      map((result) => {
        if (!result.createVoice.success) {
          throw new Error(result.createVoice.message);
        }
        return result.createVoice;
      }),
    );
  }

  refreshVoices(
    forceMetadata?: boolean,
    forceSampleAudio?: boolean,
    models?: string[],
    externalIds?: string[] | null, // Allow null
  ) {
    interface Response {
      refreshVoices: {
        success: boolean;
        message: string;
        addedVoices: Voice[];
        updatedVoices: Voice[];
      };
    }

    // Ensure empty array is sent as null for externalIds if applicable
    const variables: Record<string, unknown> = {
      forceMetadata,
      forceSampleAudio,
      models,
      externalIds: externalIds && externalIds.length > 0 ? externalIds : null,
    };

    // Remove undefined variables explicitly if GQL schema requires it
    Object.keys(variables).forEach((key) => {
      if (variables[key] === undefined) {
        delete variables[key];
      }
      // Ensure null is passed if externalIds is empty/null
      if (key === 'externalIds' && !variables[key]) {
        variables[key] = null;
      }
    });

    return this.mutate<Response>({
      mutation: REFRESH_VOICES,
      variables: variables,
    }).pipe(
      map((result) => {
        return result.refreshVoices;
      }),
    );
  }
}
