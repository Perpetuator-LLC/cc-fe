// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { PageInfo, RelayConnection, RelayEdge } from './utils/relay';
import { TeamsResult } from './teams.service';
import { Voice } from './voices.service';

export type GenericScalar = unknown;

export interface UserResult {
  id: string;
  uuid: string;
  username: string;
}

export interface MemberResult {
  user: UserResult;
  role: string;
}

export interface RssFeedResult {
  id: string;
  uuid: string;
  url: string;
}

export interface PodcastsResult {
  id: string;
  uuid: string;
  team: TeamsResult | null;
  name: string | null;
  url: string | null;
  enabled: boolean;
  slug: string | null;
  image: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerLink: string | null;
  intro: string | null;
  prompt: string | null;
  outro: string | null;
  tgChannelId: string | null;
  tgResponse: string | null;
  // categories: CategoryResult[] | null;
  categories: Record<string, string[]> | null;
  rssFeeds: RssFeedResult[];
  voice: Voice | null;
}

interface PodcastCategoriesResponse {
  podcastCategories: {
    categories: Record<string, string[]>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PodcastsService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  createPodcast(
    name: string,
    teamUuid: string,
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation CreatePodcast($name: String!, $teamUuid: UUID!) {
        createPodcast(name: $name, teamUuid: $teamUuid) {
          success
          message
          podcast {
            id
            uuid
            name
            team {
              id
              uuid
              members {
                role
                user {
                  id
                  uuid
                  username
                }
              }
            }
            voice {
              id
              uuid
              enabled
              model
              externalId
              displayName
              creditsPerMillionChar
              sampleUrl
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    interface Response {
      createPodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { name, teamUuid },
    }).pipe(
      map((data) => {
        if (!data.createPodcast.success) {
          throw new Error(data.createPodcast.message);
        }
        return data.createPodcast;
      }),
    );
  }

  refreshTgResponse(podcastUuid: string): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcast($podcastUuid: UUID!, $refreshTgResponse: Boolean) {
        updatePodcast(podcastUuid: $podcastUuid, refreshTgResponse: $refreshTgResponse) {
          success
          message
          podcast {
            id
            uuid
            name
            enabled
            slug
            url
            intro
            prompt
            outro
            tgChannelId
            tgResponse
            categories
            team {
              id
              uuid
              members {
                role
                user {
                  id
                  uuid
                  username
                }
              }
            }
          }
        }
      }
    `;

    interface Response {
      updatePodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    const refreshTgResponse = true;
    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        podcastUuid,
        refreshTgResponse,
      },
    }).pipe(
      map((data) => {
        if (!data.updatePodcast.success) {
          throw new Error(data.updatePodcast.message);
        }
        return data.updatePodcast;
      }),
    );
  }

  updatePodcast(
    podcastUuid: string,
    teamUuid: string | null = null,
    name: string | null = null,
    intro: string | null = null,
    prompt: string | null = null,
    outro: string | null = null,
    enabled: boolean | null = null,
    slug: string | null = null,
    description: string | null = null,
    ownerName: string | null = null,
    ownerEmail: string | null = null,
    ownerLink: string | null = null,
    tgBotToken: string | null = null,
    tgChannelId: string | null = null,
    refreshTgResponse: boolean | null = null,
    categories: GenericScalar = null,
    voiceUuid: string | null = null,
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcast(
        $podcastUuid: UUID!
        $teamUuid: UUID
        $name: String
        $intro: String
        $prompt: String
        $outro: String
        $enabled: Boolean
        $slug: String
        $description: String
        $ownerName: String
        $ownerEmail: String
        $ownerLink: String
        $tgBotToken: String
        $tgChannelId: String
        $refreshTgResponse: Boolean
        $categories: GenericScalar
        $voiceUuid: UUID
      ) {
        updatePodcast(
          podcastUuid: $podcastUuid
          teamUuid: $teamUuid
          name: $name
          intro: $intro
          prompt: $prompt
          outro: $outro
          enabled: $enabled
          slug: $slug
          description: $description
          ownerName: $ownerName
          ownerEmail: $ownerEmail
          ownerLink: $ownerLink
          tgBotToken: $tgBotToken
          tgChannelId: $tgChannelId
          refreshTgResponse: $refreshTgResponse
          categories: $categories
          voiceUuid: $voiceUuid
        ) {
          success
          message
          podcast {
            id
            uuid
            name
            intro
            prompt
            outro
            enabled
            slug
            url
            description
            ownerName
            ownerEmail
            ownerLink
            tgChannelId
            tgResponse
            categories
            voice {
              id
              uuid
              enabled
              model
              externalId
              displayName
              creditsPerMillionChar
              sampleUrl
              createdAt
              updatedAt
              sampleUrl
            }
            team {
              id
              uuid
              name
              members {
                user {
                  id
                  uuid
                  username
                }
                role
              }
            }
          }
        }
      }
    `;

    interface Response {
      updatePodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        podcastUuid,
        teamUuid,
        name,
        intro,
        prompt,
        outro,
        enabled,
        slug,
        description,
        ownerName,
        ownerEmail,
        ownerLink,
        tgBotToken,
        tgChannelId,
        refreshTgResponse,
        categories,
        voiceUuid,
      },
    }).pipe(
      map((data) => {
        if (!data.updatePodcast.success) {
          throw new Error(data.updatePodcast.message);
        }
        return data.updatePodcast;
      }),
    );
  }

  getPodcastById(podcastUuid: string): Observable<PodcastsResult> {
    const GET_PODCAST_BY_ID = gql`
      query GetPodcastById($podcastUuid: UUID!) {
        podcasts(podcastUuid: $podcastUuid) {
          edges {
            cursor
            node {
              id
              uuid
              name
              intro
              prompt
              outro
              enabled
              slug
              url
              imageUrl
              description
              ownerName
              ownerEmail
              ownerLink
              tgChannelId
              tgResponse
              categories
              rssFeeds {
                id
                uuid
                url
              }
              team {
                id
                uuid
                members {
                  user {
                    id
                    uuid
                    username
                  }
                  role
                }
              }
              voice {
                id
                uuid
                enabled
                model
                externalId
                displayName
                creditsPerMillionChar
                sampleUrl
                createdAt
                updatedAt
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    interface Response {
      podcasts: RelayConnection<PodcastsResult>;
    }

    return this.query<Response>({
      query: GET_PODCAST_BY_ID,
      variables: { podcastUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ podcasts }) => {
        if (!podcasts.edges || podcasts.edges.length !== 1) {
          throw new Error('Podcast data is missing');
        }
        return podcasts.edges[0].node;
      }),
    );
  }

  getPodcastsByTeamId(teamUuid: string) {
    const GET_PODCASTS_BY_TEAM_UUID = gql`
      query PodcastsByTeamId($teamUuid: UUID!, $first: Int, $after: String) {
        podcasts(teamUuid: $teamUuid, first: $first, after: $after) {
          edges {
            cursor
            node {
              id
              uuid
              name
              intro
              prompt
              outro
              enabled
              slug
              url
              imageUrl
              description
              ownerName
              ownerEmail
              ownerLink
              tgChannelId
              tgResponse
              categories
              rssFeeds {
                id
                uuid
                url
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    interface Response {
      podcasts: RelayConnection<PodcastsResult>;
    }

    return this.query<Response>({
      query: GET_PODCASTS_BY_TEAM_UUID,
      variables: { teamUuid, first: 10, after: null },
    }).pipe(map((result) => result.podcasts));
  }

  getPodcasts(first = 10, after: string | null = null) {
    const GQL = gql`
      query GetPodcasts($first: Int, $after: String) {
        podcasts(first: $first, after: $after) {
          edges {
            cursor
            node {
              id
              uuid
              name
              #imageUrl // Don't use imageUrl, use thumbnailUrl for loading many podcasts
              thumbnailUrl
              tgChannelId
              tgResponse
              categories
              team {
                uuid
                name
                members {
                  user {
                    id
                    uuid
                    username
                  }
                  role
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    interface Response {
      podcasts: {
        edges: RelayEdge<PodcastsResult>[];
        pageInfo: PageInfo;
      };
    }

    return this.query<Response>({
      query: GQL,
      variables: { first, after },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ podcasts }) => ({
        podcasts: podcasts.edges.map((edge) => edge.node),
        pageInfo: podcasts.pageInfo,
      })),
    );
  }

  getPodcastCategories(): Observable<Record<string, string[]>> {
    const GQL = gql`
      query GetPodcastCategories {
        podcastCategories {
          categories
        }
      }
    `;

    return this.query<PodcastCategoriesResponse>({
      query: GQL,
    }).pipe(map((data) => data.podcastCategories.categories));
  }

  deletePodcast(podcastUuid: string, confirm: string) {
    const DELETE_TEAM = gql`
      mutation DeletePodcast($podcastUuid: UUID!, $confirm: String!) {
        deletePodcast(podcastUuid: $podcastUuid, confirm: $confirm) {
          success
          message
        }
      }
    `;

    interface Response {
      deletePodcast: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_TEAM,
      variables: { podcastUuid, confirm },
    }).pipe(
      map((data) => {
        if (!data.deletePodcast.success) {
          throw new Error(data.deletePodcast.message);
        }
        return data.deletePodcast;
      }),
    );
  }

  uploadPodcastImage(
    podcastUuid: string,
    image: File,
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcastPodcastImage($podcastUuid: UUID!, $image: Upload!) {
        updatePodcast(podcastUuid: $podcastUuid, image: $image) {
          success
          message
          podcast {
            id
            uuid
            name
            imageUrl
          }
        }
      }
    `;

    interface Response {
      updatePodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        podcastUuid,
        image,
      },
      context: {
        useMultipart: true,
      },
    }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        if (!result.updatePodcast.success) {
          throw new Error(result.updatePodcast.message);
        }
        return result.updatePodcast;
      }),
    );
  }

  deletePodcastImage(podcastUuid: string): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation DeletePodcastPodcastImage($podcastUuid: UUID!, $deleteImage: Boolean!) {
        updatePodcast(podcastUuid: $podcastUuid, deleteImage: $deleteImage) {
          success
          message
          podcast {
            id
            uuid
            name
            imageUrl
          }
        }
      }
    `;

    interface Response {
      updatePodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        podcastUuid,
        deleteImage: true,
      },
      context: {
        useMultipart: true,
      },
    }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        if (!result.updatePodcast.success) {
          throw new Error(result.updatePodcast.message);
        }
        return result.updatePodcast;
      }),
    );
  }

  setPodcastRssFeeds(podcastUuid: string, rssFeedUuids: string[]) {
    const GQL = gql`
      mutation UpdatePodcastRssFeeds($podcastUuid: UUID!, $rssFeedUuids: [UUID!]!) {
        updatePodcastRssFeeds(podcastUuid: $podcastUuid, rssFeedUuids: $rssFeedUuids) {
          podcast {
            id
            uuid
            rssFeeds {
              id
              uuid
              url
            }
          }
        }
      }
    `;

    interface Response {
      udpatePodcastRssFeeds: {
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        podcastUuid,
        rssFeedUuids,
      },
    }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        return result.updatePodcastRssFeeds;
      }),
    );
  }

  createRssFeed(url: string) {
    const GQL = gql`
      mutation CreateRssFeed($url: String!) {
        createRssFeed(url: $url) {
          rssFeed {
            id
            uuid
            url
          }
        }
      }
    `;

    interface Response {
      createRssFeed: {
        rssFeed: RssFeedResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        url,
      },
    }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        return result.createRssFeed;
      }),
    );
  }
}
