// Copyright (c) 2026 Perpetuator LLC
import { Injectable, inject } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, map } from 'rxjs';

export type SocialPlatform =
  | 'TWITTER'
  | 'LINKEDIN'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'TIKTOK'
  | 'YOUTUBE'
  | 'THREADS'
  | 'BLUESKY';

export type SocialAccountStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';

export type BroadcastStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'QUEUED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'FAILED'
  | 'DELETED';

export type BroadcastContentType =
  | 'TEXT'
  | 'IMAGE'
  | 'VIDEO'
  | 'CAROUSEL'
  | 'STORY'
  | 'REEL'
  | 'LINK';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  platformUsername: string | null;
  platformPageId: string | null;
  profileUrl: string | null;
  profileImageUrl: string | null;
  status: SocialAccountStatus;
  lastVerifiedAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
  autoPublish: boolean;
  defaultHashtags: string[];
  createdAt: string;
  updatedAt: string;
  broadcastCount: number | null;
  isTokenExpired: boolean | null;
}

export interface Broadcast {
  id: string;
  socialAccount: SocialAccount;
  contentType: BroadcastContentType;
  text: string;
  textGenerated: boolean;
  linkUrl: string | null;
  hashtags: string[];
  mediaUrls: string[];
  thumbnailUrl: string | null;
  status: BroadcastStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  platformPostId: string | null;
  platformUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  impressions: number | null;
  engagements: number | null;
  clicks: number | null;
  analyticsUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  platform: string | null;
  sourceType: string | null;
  sourceUuid: string | null;
}

const SOCIAL_ACCOUNTS_QUERY = gql`
  query SocialAccounts($teamUuid: UUID, $platform: String, $isActive: Boolean) {
    socialAccounts(teamUuid: $teamUuid, platform: $platform, isActive: $isActive) {
      id
      platform
      accountName
      platformUsername
      profileUrl
      profileImageUrl
      status
      lastVerifiedAt
      lastUsedAt
      isActive
      autoPublish
      defaultHashtags
      createdAt
      updatedAt
      broadcastCount
      isTokenExpired
    }
  }
`;

const SOCIAL_ACCOUNT_QUERY = gql`
  query SocialAccount($uuid: UUID!) {
    socialAccount(uuid: $uuid) {
      id
      platform
      accountName
      platformUsername
      platformPageId
      profileUrl
      profileImageUrl
      status
      lastVerifiedAt
      lastUsedAt
      isActive
      autoPublish
      defaultHashtags
      createdAt
      updatedAt
      broadcastCount
      isTokenExpired
    }
  }
`;

const BROADCASTS_QUERY = gql`
  query Broadcasts($socialAccountUuid: UUID, $status: String, $limit: Int) {
    broadcasts(socialAccountUuid: $socialAccountUuid, status: $status, limit: $limit) {
      id
      socialAccount {
        id
        platform
        accountName
        profileImageUrl
      }
      contentType
      text
      textGenerated
      linkUrl
      hashtags
      mediaUrls
      thumbnailUrl
      status
      scheduledAt
      publishedAt
      platformPostId
      platformUrl
      errorMessage
      retryCount
      impressions
      engagements
      clicks
      analyticsUpdatedAt
      createdAt
      updatedAt
      platform
      sourceType
      sourceUuid
    }
  }
`;

const BROADCAST_QUERY = gql`
  query Broadcast($uuid: UUID!) {
    broadcast(uuid: $uuid) {
      id
      socialAccount {
        id
        platform
        accountName
        platformUsername
        profileImageUrl
      }
      contentType
      text
      textGenerated
      linkUrl
      hashtags
      mediaUrls
      thumbnailUrl
      status
      scheduledAt
      publishedAt
      platformPostId
      platformUrl
      errorMessage
      retryCount
      impressions
      engagements
      clicks
      analyticsUpdatedAt
      createdAt
      updatedAt
      platform
      sourceType
      sourceUuid
    }
  }
`;

const BROADCASTS_FOR_SOURCE_QUERY = gql`
  query BroadcastsForSource($sourceType: String!, $sourceUuid: UUID!) {
    broadcastsForSource(sourceType: $sourceType, sourceUuid: $sourceUuid) {
      id
      socialAccount {
        id
        platform
        accountName
        profileImageUrl
      }
      contentType
      text
      status
      scheduledAt
      publishedAt
      platformUrl
      createdAt
    }
  }
`;

const SUPPORTED_PLATFORMS_QUERY = gql`
  query SupportedPlatforms {
    supportedPlatforms
  }
`;

const CREATE_SOCIAL_ACCOUNT_MUTATION = gql`
  mutation CreateSocialAccount(
    $teamUuid: UUID!
    $platform: String!
    $accountName: String!
    $platformUsername: String
    $accessToken: String
    $refreshToken: String
    $apiKey: String
    $apiSecret: String
  ) {
    createSocialAccount(
      teamUuid: $teamUuid
      platform: $platform
      accountName: $accountName
      platformUsername: $platformUsername
      accessToken: $accessToken
      refreshToken: $refreshToken
      apiKey: $apiKey
      apiSecret: $apiSecret
    ) {
      success
      message
      socialAccount {
        id
        platform
        accountName
        status
      }
    }
  }
`;

const UPDATE_SOCIAL_ACCOUNT_MUTATION = gql`
  mutation UpdateSocialAccount(
    $accountUuid: UUID!
    $accountName: String
    $platformUsername: String
    $isActive: Boolean
    $autoPublish: Boolean
    $defaultHashtags: [String]
  ) {
    updateSocialAccount(
      accountUuid: $accountUuid
      accountName: $accountName
      platformUsername: $platformUsername
      isActive: $isActive
      autoPublish: $autoPublish
      defaultHashtags: $defaultHashtags
    ) {
      success
      message
      socialAccount {
        id
        accountName
        isActive
        autoPublish
      }
    }
  }
`;

const DELETE_SOCIAL_ACCOUNT_MUTATION = gql`
  mutation DeleteSocialAccount($accountUuid: UUID!) {
    deleteSocialAccount(accountUuid: $accountUuid) {
      success
      message
    }
  }
`;

const VERIFY_SOCIAL_ACCOUNT_MUTATION = gql`
  mutation VerifySocialAccount($accountUuid: UUID!) {
    verifySocialAccount(accountUuid: $accountUuid) {
      success
      message
      job {
        id
        status
      }
    }
  }
`;

const CREATE_BROADCAST_MUTATION = gql`
  mutation CreateBroadcast(
    $socialAccountUuid: UUID!
    $text: String!
    $contentType: String
    $linkUrl: String
    $hashtags: [String]
    $mediaUrls: [String]
    $scheduledAt: DateTime
    $sourceType: String
    $sourceUuid: UUID
  ) {
    createBroadcast(
      socialAccountUuid: $socialAccountUuid
      text: $text
      contentType: $contentType
      linkUrl: $linkUrl
      hashtags: $hashtags
      mediaUrls: $mediaUrls
      scheduledAt: $scheduledAt
      sourceType: $sourceType
      sourceUuid: $sourceUuid
    ) {
      success
      message
      broadcast {
        id
        text
        status
        scheduledAt
      }
    }
  }
`;

const UPDATE_BROADCAST_MUTATION = gql`
  mutation UpdateBroadcast(
    $broadcastUuid: UUID!
    $text: String
    $linkUrl: String
    $hashtags: [String]
    $scheduledAt: DateTime
  ) {
    updateBroadcast(
      broadcastUuid: $broadcastUuid
      text: $text
      linkUrl: $linkUrl
      hashtags: $hashtags
      scheduledAt: $scheduledAt
    ) {
      success
      message
      broadcast {
        id
        text
        status
        scheduledAt
      }
    }
  }
`;

const PUBLISH_BROADCAST_MUTATION = gql`
  mutation PublishBroadcast($broadcastUuid: UUID!) {
    publishBroadcast(broadcastUuid: $broadcastUuid) {
      success
      message
      job {
        id
        status
      }
    }
  }
`;

const DELETE_BROADCAST_MUTATION = gql`
  mutation DeleteBroadcast($broadcastUuid: UUID!) {
    deleteBroadcast(broadcastUuid: $broadcastUuid) {
      success
      message
    }
  }
`;

const GENERATE_BROADCAST_FROM_SOURCE_MUTATION = gql`
  mutation GenerateBroadcastFromSource(
    $socialAccountUuid: UUID!
    $sourceType: String!
    $sourceUuid: UUID!
    $templateUuid: UUID
  ) {
    generateBroadcastFromSource(
      socialAccountUuid: $socialAccountUuid
      sourceType: $sourceType
      sourceUuid: $sourceUuid
      templateUuid: $templateUuid
    ) {
      success
      message
      job {
        id
        status
      }
    }
  }
`;

// Job interface for mutations that return jobs
export interface Job {
  id: string;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class SocialsService {
  private readonly apollo = inject(Apollo);

  getSupportedPlatforms(): Observable<string[]> {
    return this.apollo
      .query<{ supportedPlatforms: string[] }>({
        query: SUPPORTED_PLATFORMS_QUERY,
        fetchPolicy: 'cache-first',
      })
      .pipe(map((result) => result.data?.supportedPlatforms ?? []));
  }

  getSocialAccounts(
    teamUuid?: string,
    platform?: string,
    isActive?: boolean,
  ): Observable<SocialAccount[]> {
    return this.apollo
      .query<{ socialAccounts: SocialAccount[] }>({
        query: SOCIAL_ACCOUNTS_QUERY,
        variables: { teamUuid, platform, isActive },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.socialAccounts ?? []));
  }

  getSocialAccount(uuid: string): Observable<SocialAccount> {
    return this.apollo
      .query<{ socialAccount: SocialAccount }>({
        query: SOCIAL_ACCOUNT_QUERY,
        variables: { uuid },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data?.socialAccount) {
            throw new Error('Social account not found');
          }
          return result.data.socialAccount;
        }),
      );
  }

  getBroadcasts(
    socialAccountUuid?: string,
    status?: string,
    limit?: number,
  ): Observable<Broadcast[]> {
    return this.apollo
      .query<{ broadcasts: Broadcast[] }>({
        query: BROADCASTS_QUERY,
        variables: { socialAccountUuid, status, limit },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.broadcasts ?? []));
  }

  getBroadcast(uuid: string): Observable<Broadcast> {
    return this.apollo
      .query<{ broadcast: Broadcast }>({
        query: BROADCAST_QUERY,
        variables: { uuid },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data?.broadcast) {
            throw new Error('Broadcast not found');
          }
          return result.data.broadcast;
        }),
      );
  }

  getBroadcastsForSource(sourceType: string, sourceUuid: string): Observable<Broadcast[]> {
    return this.apollo
      .query<{ broadcastsForSource: Broadcast[] }>({
        query: BROADCASTS_FOR_SOURCE_QUERY,
        variables: { sourceType, sourceUuid },
        fetchPolicy: 'network-only',
      })
      .pipe(map((result) => result.data?.broadcastsForSource ?? []));
  }

  createSocialAccount(
    teamUuid: string,
    platform: string,
    accountName: string,
    options?: {
      platformUsername?: string;
      accessToken?: string;
      refreshToken?: string;
      apiKey?: string;
      apiSecret?: string;
    },
  ): Observable<{ success: boolean; socialAccount?: SocialAccount; message?: string }> {
    return this.apollo
      .mutate<{
        createSocialAccount: { success: boolean; socialAccount?: SocialAccount; message?: string };
      }>({
        mutation: CREATE_SOCIAL_ACCOUNT_MUTATION,
        variables: { teamUuid, platform, accountName, ...options },
      })
      .pipe(
        map((result) => {
          if (!result.data?.createSocialAccount) {
            throw new Error('Failed to create social account');
          }
          return result.data.createSocialAccount;
        }),
      );
  }

  updateSocialAccount(
    accountUuid: string,
    updates: {
      accountName?: string;
      platformUsername?: string;
      isActive?: boolean;
      autoPublish?: boolean;
      defaultHashtags?: string[];
    },
  ): Observable<{ success: boolean; socialAccount?: SocialAccount; message?: string }> {
    return this.apollo
      .mutate<{
        updateSocialAccount: { success: boolean; socialAccount?: SocialAccount; message?: string };
      }>({
        mutation: UPDATE_SOCIAL_ACCOUNT_MUTATION,
        variables: { accountUuid, ...updates },
      })
      .pipe(
        map((result) => {
          if (!result.data?.updateSocialAccount) {
            throw new Error('Failed to update social account');
          }
          return result.data.updateSocialAccount;
        }),
      );
  }

  deleteSocialAccount(accountUuid: string): Observable<{ success: boolean; message?: string }> {
    return this.apollo
      .mutate<{ deleteSocialAccount: { success: boolean; message?: string } }>({
        mutation: DELETE_SOCIAL_ACCOUNT_MUTATION,
        variables: { accountUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.deleteSocialAccount) {
            throw new Error('Failed to delete social account');
          }
          return result.data.deleteSocialAccount;
        }),
      );
  }

  verifySocialAccount(
    accountUuid: string,
  ): Observable<{ success: boolean; job?: Job; message?: string }> {
    return this.apollo
      .mutate<{
        verifySocialAccount: { success: boolean; job?: Job; message?: string };
      }>({
        mutation: VERIFY_SOCIAL_ACCOUNT_MUTATION,
        variables: { accountUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.verifySocialAccount) {
            throw new Error('Failed to verify social account');
          }
          return result.data.verifySocialAccount;
        }),
      );
  }

  createBroadcast(
    socialAccountUuid: string,
    text: string,
    options?: {
      contentType?: string;
      linkUrl?: string;
      hashtags?: string[];
      mediaUrls?: string[];
      scheduledAt?: string;
      sourceType?: string;
      sourceUuid?: string;
    },
  ): Observable<{ success: boolean; broadcast?: Broadcast; message?: string }> {
    return this.apollo
      .mutate<{
        createBroadcast: { success: boolean; broadcast?: Broadcast; message?: string };
      }>({
        mutation: CREATE_BROADCAST_MUTATION,
        variables: { socialAccountUuid, text, ...options },
      })
      .pipe(
        map((result) => {
          if (!result.data?.createBroadcast) {
            throw new Error('Failed to create broadcast');
          }
          return result.data.createBroadcast;
        }),
      );
  }

  updateBroadcast(
    broadcastUuid: string,
    updates: {
      text?: string;
      linkUrl?: string;
      hashtags?: string[];
      scheduledAt?: string;
    },
  ): Observable<{ success: boolean; broadcast?: Broadcast; message?: string }> {
    return this.apollo
      .mutate<{
        updateBroadcast: { success: boolean; broadcast?: Broadcast; message?: string };
      }>({
        mutation: UPDATE_BROADCAST_MUTATION,
        variables: { broadcastUuid, ...updates },
      })
      .pipe(
        map((result) => {
          if (!result.data?.updateBroadcast) {
            throw new Error('Failed to update broadcast');
          }
          return result.data.updateBroadcast;
        }),
      );
  }

  publishBroadcast(
    broadcastUuid: string,
  ): Observable<{ success: boolean; job?: Job; message?: string }> {
    return this.apollo
      .mutate<{ publishBroadcast: { success: boolean; job?: Job; message?: string } }>({
        mutation: PUBLISH_BROADCAST_MUTATION,
        variables: { broadcastUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.publishBroadcast) {
            throw new Error('Failed to publish broadcast');
          }
          return result.data.publishBroadcast;
        }),
      );
  }

  deleteBroadcast(broadcastUuid: string): Observable<{ success: boolean; message?: string }> {
    return this.apollo
      .mutate<{ deleteBroadcast: { success: boolean; message?: string } }>({
        mutation: DELETE_BROADCAST_MUTATION,
        variables: { broadcastUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.deleteBroadcast) {
            throw new Error('Failed to delete broadcast');
          }
          return result.data.deleteBroadcast;
        }),
      );
  }

  generateBroadcastFromSource(
    socialAccountUuid: string,
    sourceType: string,
    sourceUuid: string,
    templateUuid?: string,
  ): Observable<{ success: boolean; job?: Job; message?: string }> {
    return this.apollo
      .mutate<{
        generateBroadcastFromSource: {
          success: boolean;
          job?: Job;
          message?: string;
        };
      }>({
        mutation: GENERATE_BROADCAST_FROM_SOURCE_MUTATION,
        variables: { socialAccountUuid, sourceType, sourceUuid, templateUuid },
      })
      .pipe(
        map((result) => {
          if (!result.data?.generateBroadcastFromSource) {
            throw new Error('Failed to generate broadcast');
          }
          return result.data.generateBroadcastFromSource;
        }),
      );
  }
}

