// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { TeamsResult } from './teams-list/teams-list.component';
import { NewsResult } from './news/news.component';
import { Job } from './job.service';
import { FetchPolicy } from '@apollo/client';
import { ErrorHandlerService } from './error-handler.service';

export interface Episode {
  id: string;
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

export interface EpisodesData {
  success: boolean;
  message: string;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  episodes: Episode[];
}

const FETCH_EPISODES = gql`
  query GetEpisodesData($podcastUuid: UUID, $first: Int, $after: String, $orderBy: String!) {
    episodes(podcastUuid: $podcastUuid, first: $first, after: $after, orderBy: $orderBy) {
      edges {
        cursor
        node {
          id
          date
          podcast {
            name
          }
          title
          content
          news {
            id
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

export interface EpisodeEdge {
  cursor: string;
  node: Episode;
}

export interface EpisodePageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

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

  episodes(
    first = 10,
    after: string | null = null,
    orderBy = 'date',
    direction = 'DESC',
    podcastUuid: string | null = null,
  ) {
    // build the Relay‐style sort string
    const sort = direction === 'DESC' ? `-${orderBy}` : orderBy;

    interface Response {
      episodes: {
        edges: EpisodeEdge[];
        pageInfo: EpisodePageInfo;
      };
    }

    return this.query<Response>({
      query: FETCH_EPISODES,
      variables: { podcastUuid, first, after, sort },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ episodes }) => ({
        episodes: episodes.edges.map((edge) => edge.node),
        pageInfo: episodes.pageInfo,
      })),
    );
  }

  episodeById(id: string | null, fetchPolicy = 'cache-first' as FetchPolicy) {
    if (id === null) return throwError(() => new Error('Episode ID is required'));
    const GQL = gql`
      query GetEpisodeData($id: ID!) {
        episodes(episodeId: $id) {
          episodes {
            id
            date
            title
            content
            audioUrl
            isLive
            podcastDate
            telegramDate
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
            news {
              id
              url
              title
              summary
            }
          }
        }
      }
    `;

    interface Response {
      episodes: EpisodesData;
    }

    return this.query<Response>({
      query: GQL,
      variables: { id },
      fetchPolicy: fetchPolicy,
    }).pipe(
      map((data) => {
        if (!data.episodes?.episodes || data.episodes.episodes.length !== 1) {
          throw new Error('Episode not found');
        }
        return data.episodes.episodes[0];
      }),
    );
  }

  updateEpisode(id: string | null, updatedTitle: string | null, updatedContent: string | null, isLive: boolean | null) {
    if (id === null) return throwError(() => new Error('Episode ID is required'));
    if (updatedTitle === null) return throwError(() => new Error('Updated title is required'));
    if (updatedContent === null) return throwError(() => new Error('Updated content is required'));
    if (isLive === null) return throwError(() => new Error('Updated is live is required'));

    const GQL = gql`
      mutation UpdateEpisodes($id: ID!, $title: String!, $content: String!, $isLive: Boolean!) {
        updateEpisode(episodeId: $id, title: $title, content: $content, isLive: $isLive) {
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
      variables: { id, title: updatedTitle, content: updatedContent, isLive: isLive },
    }).pipe(
      map((data) => {
        if (!data.updateEpisode.success) {
          throw new Error(data.updateEpisode.message);
        }
        return data.updateEpisode;
      }),
    );
  }

  generateAudio(id: string) {
    if (id === null) return throwError(() => new Error('Episode ID is required'));

    const GQL = gql`
      mutation UpdateEpisodesAudio {
        updateEpisodeAudio(episodeId: "${id}") {
          success
          message
          job {
            id
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

  publishAudio(episodeId: string) {
    if (episodeId === null) return throwError(() => new Error('Episode ID is required'));

    const GQL = gql`
      mutation PublishEpisodeAudio($id: ID!) {
        publishEpisodeAudio(episodeId: $id) {
          success
          message
          episode {
            id
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
      variables: { id: episodeId },
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
