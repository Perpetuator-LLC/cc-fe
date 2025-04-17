// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { PageInfo, RelayEdge } from './utils/relay';
import { TeamsResult } from './teams.service';

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
  team: TeamsResult;
  name: string | null;
  url: string | null;
  enabled: boolean;
  slug: string | null;
  image: string | null;
  imageUrl: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerLink: string | null;
  intro: string | null;
  prompt: string | null;
  outro: string | null;
  tgChannelId: string | null;
  tgResponse: string | null;
  rssFeeds: RssFeedResult[];
}

export interface PodcastConnection {
  edges: RelayEdge<PodcastsResult>[];
  pageInfo: PageInfo;
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
            name
            team {
              members {
                role
                user {
                  id
                  username
                }
              }
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

  refreshTgResponse(id: string): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcast($uuid: UUID!, $refreshTgResponse: Boolean) {
        updatePodcast(podcastUuid: $uuid, refreshTgResponse: $refreshTgResponse) {
          success
          message
          podcast {
            id
            name
            enabled
            slug
            url
            intro
            prompt
            outro
            tgChannelId
            tgResponse
            team {
              members {
                user {
                  id
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

    const refreshTgResponse = true;
    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        id,
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
    id: string,
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
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcast(
        $uuid: UUID!
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
      ) {
        updatePodcast(
          podcastUuid: $uuid
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
        ) {
          success
          message
          podcast {
            id
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
            team {
              id
              name
              members {
                user {
                  id
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
        id,
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

  getPodcastById(id: string): Observable<PodcastsResult> {
    const GET_PODCAST_BY_ID = gql`
      query GetPodcastById($uuid: UUID!) {
        podcasts(podcastUuid: $uuid) {
          edges {
            cursor
            node {
              id
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
              rssFeeds {
                id
                url
              }
              team {
                id
                members {
                  user {
                    id
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
      query: GET_PODCAST_BY_ID,
      variables: { uuid: id },
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

  getPodcastsByTeamId(teamUuid: string): Observable<PodcastConnection> {
    const GET_PODCASTS_BY_TEAM_UUID = gql`
      query PodcastsByTeamId($teamUuid: UUID!, $first: Int, $after: String) {
        podcasts(teamUuid: $teamUuid, first: $first, after: $after) {
          edges {
            cursor
            node {
              id
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
              rssFeeds {
                id
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
      podcasts: PodcastConnection;
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
              team {
                members {
                  user {
                    id
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
    id: string,
    image: File,
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcastPodcastImage($podcastUuid: UUID!, $image: Upload!) {
        updatePodcast(podcastUuid: $podcastUuid, image: $image) {
          success
          message
          podcast {
            id
            name
            imageUrl
          }
        }
      }
    `;

    return this.apollo
      .mutate({
        mutation: GQL,
        variables: {
          id,
          image,
        },
        context: {
          useMultipart: true,
        },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (!result.data.updatePodcast.success) {
            throw new Error(result.data.updatePodcast.message);
          }
          return result.data.updatePodcast;
        }),
      );
  }

  setPodcastRssFeeds(podcastUuid: string, rssFeedUuids: string[]) {
    const GQL = gql`
      mutation UpdatePodcastRssFeeds($podcastUuid: UUID!, $rssFeedUuids: [UUID!]!) {
        updatePodcastRssFeeds(podcastUuid: $podcastUuid, rssFeedUuids: $rssFeedUuids) {
          podcast {
            id
            rssFeeds {
              id
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
