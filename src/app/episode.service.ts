// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { Job } from './job.service';
import { FetchPolicy } from '@apollo/client';
import { ErrorHandlerService } from './error-handler.service';
import { NewsResult } from './news.service';
import { RelayConnection } from './utils/relay';
import { TeamsResult } from './teams.service';

export interface Episode {
  id: string;
  uuid: string;
  date: string;
  title: string;
  content: string;
  audioUrl: string;
  isLive: boolean;
  podcastDate: string;
  telegramDate: string;
  news: NewsResult[];
  team: TeamsResult;
}

const GET_EPISODES = gql`
  query GetEpisodes($podcastUuid: UUID, $first: Int, $after: String, $orderBy: String!) {
    episodes(podcastUuid: $podcastUuid, first: $first, after: $after, orderBy: $orderBy) {
      edges {
        cursor
        node {
          id
          uuid
          date
          podcast {
            id
            uuid
            name
          }
          title
          content
          news {
            id
            uuid
            url
            title
            summary
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

const GET_EPISODE = gql`
  query GetEpisode($episodeUuid: UUID!) {
    episodes(episodeUuid: $episodeUuid) {
      edges {
        cursor
        node {
          id
          uuid
          date
          title
          content
          audioUrl
          isLive
          podcastDate
          telegramDate
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
                  username
                }
              }
            }
          }
          news {
            id
            uuid
            url
            title
            summary
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

@Injectable({
  providedIn: 'root',
})
export class EpisodeService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  getEpisodes(
    first = 10,
    after: string | null = null,
    sort = 'date',
    direction = 'DESC',
    podcastUuid: string | null = null,
  ) {
    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    interface Response {
      episodes: RelayConnection<Episode>;
    }

    return this.query<Response>({
      query: GET_EPISODES,
      variables: { podcastUuid, first, after, orderBy },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ episodes }) => ({
        episodes: episodes.edges.map((edge) => edge.node),
        pageInfo: episodes.pageInfo,
      })),
    );
  }

  getEpisodeById(episodeUuid: string | null, fetchPolicy = 'cache-first' as FetchPolicy) {
    if (episodeUuid === null) return throwError(() => new Error('Episode ID is required'));

    interface Response {
      episodes: RelayConnection<Episode>;
    }

    return this.query<Response>({
      query: GET_EPISODE,
      variables: { episodeUuid },
      fetchPolicy: fetchPolicy,
    }).pipe(
      map((response) => {
        if (!response.episodes?.edges || response.episodes.edges.length !== 1) {
          throw new Error('Episode not found');
        }
        return response.episodes.edges[0].node;
      }),
    );
  }

  updateEpisode(
    episodeUuid: string | null,
    updatedTitle: string | null,
    updatedContent: string | null,
    isLive: boolean | null,
  ) {
    if (episodeUuid === null) return throwError(() => new Error('Episode ID is required'));
    if (updatedTitle === null) return throwError(() => new Error('Updated title is required'));
    if (updatedContent === null) return throwError(() => new Error('Updated content is required'));
    if (isLive === null) return throwError(() => new Error('Updated is live is required'));

    const GQL = gql`
      mutation UpdateEpisodes($episodeUuid: UUID!, $title: String!, $content: String!, $isLive: Boolean!) {
        updateEpisode(episodeUuid: $episodeUuid, title: $title, content: $content, isLive: $isLive) {
          success
          message
        }
      }
    `;

    interface Response {
      updateEpisode: {
        success: boolean;
        message: string;
        episode: Episode;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { episodeUuid, title: updatedTitle, content: updatedContent, isLive: isLive },
    }).pipe(
      map((data) => {
        if (!data.updateEpisode.success) {
          throw new Error(data.updateEpisode.message);
        }
        return data.updateEpisode;
      }),
    );
  }

  generateAudio(episodeUuid: string) {
    if (episodeUuid === null) return throwError(() => new Error('Episode ID is required'));

    const GQL = gql`
      mutation UpdateEpisodesAudio {
        updateEpisodeAudio(episodeUuid: "${episodeUuid}") {
          success
          message
          job {
            id
            uuid
            kind
            status
            error
            result
            createdAt
            updatedAt
          }
        }
      }
    `;

    interface Response {
      updateEpisodeAudio: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
    }).pipe(
      map((data) => {
        if (!data.updateEpisodeAudio.success) {
          throw new Error(data.updateEpisodeAudio.message);
        }
        return data.updateEpisodeAudio;
      }),
    );
  }

  publishAudio(episodeUuid: string) {
    if (episodeUuid === null) return throwError(() => new Error('Episode ID is required'));

    const GQL = gql`
      mutation PublishEpisodeAudio($episodeUuid: UUID!) {
        publishEpisodeAudio(episodeUuid: $episodeUuid) {
          success
          message
          episode {
            id
            uuid
            date
            title
            content
            audioUrl
            isLive
            podcastDate
            telegramDate
          }
        }
      }
    `;

    interface Response {
      publishEpisodeAudio: {
        success: boolean;
        message: string;
        episode: Episode;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { episodeUuid },
    }).pipe(
      map((data) => {
        if (!data.publishEpisodeAudio.success) {
          throw new Error(data.publishEpisodeAudio.message);
        }
        return data.publishEpisodeAudio;
      }),
    );
  }
}
