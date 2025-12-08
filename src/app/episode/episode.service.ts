// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../base.service';
import { Job } from '../jobs/job.service';
import { FetchPolicy } from '@apollo/client';
import { ErrorHandlerService } from '../utils/error-handler.service';
import { NewsResult } from '../news/news.service';
import { RelayConnection } from '../utils/relay';
import { TeamsResult } from '../team/teams.service';

export interface EpisodeVersion {
  uuid: string;
  versionNumber: number;
  title: string;
  description: string;
  content: string;
  validatedCompliance: boolean;
  validatedFacts: boolean;
  validatedLength: boolean;
  validationNotes?: string;
  changeType: 'created' | 'validated' | 'edited' | 'regenerated';
  audioUrl?: string;
  createdAt: string;
  createdBy?: {
    id: string;
    username: string;
  };
}

export interface Episode {
  id: string;
  uuid: string;
  date: string;
  title: string;
  description: string;
  content: string;
  currentVersionNumber: number;
  versions: EpisodeVersion[];
  audioUrl: string;
  audioIsCustomUpload: boolean;
  isLive: boolean;
  podcastDate: string;
  telegramDate: string;
  news: NewsResult[];
  researchUrls: string[];
  team: TeamsResult;
  podcast: { id: string; uuid: string; name: string; enabled: boolean };
  topic?: { uuid: string; title: string } | null;
}

const GET_EPISODES = gql`
  query GetEpisodes(
    $podcastUuid: UUID
    $first: Int
    $after: String
    $orderBy: String!
    $titleContains: String
    $isLive: Boolean
  ) {
    episodes(
      podcastUuid: $podcastUuid
      first: $first
      after: $after
      orderBy: $orderBy
      titleContains: $titleContains
      isLive: $isLive
    ) {
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
            enabled
          }
          title
          content
          isLive
          currentVersionNumber
          versions {
            uuid
            versionNumber
            validatedCompliance
            validatedFacts
            validatedLength
          }
          news {
            id
            uuid
            url
            title
            summary
            source
            publishedAt
            blocked
            rssFeeds {
              id
              uuid
              url
              name
              isReachable
              isParsable
              lastFetchAttempt
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
          description
          content
          currentVersionNumber
          versions {
            uuid
            versionNumber
            title
            description
            content
            validatedCompliance
            validatedFacts
            validatedLength
            validationNotes
            changeType
            audioUrl
            createdAt
            createdBy {
              id
              username
            }
          }
          audioUrl
          audioIsCustomUpload
          isLive
          podcastDate
          telegramDate
          topic {
            uuid
            title
          }
          podcast {
            id
            uuid
            name
            enabled
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
            source
            publishedAt
            blocked
            rssFeeds {
              id
              uuid
              url
              name
              isReachable
              isParsable
              lastFetchAttempt
            }
          }
          researchUrls
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
    titleContains: string | null = null,
    isLive: boolean | null = null,
  ) {
    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    interface Response {
      episodes: RelayConnection<Episode>;
    }

    return this.query<Response>({
      query: GET_EPISODES,
      variables: { podcastUuid, first, after, orderBy, titleContains, isLive },
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
    episodeUuid: string,
    updatedTitle?: string,
    updatedDescription?: string,
    updatedContent?: string,
    isLive?: boolean,
  ) {
    // Build the mutation dynamically based on which fields are provided
    const GQL = gql`
      mutation UpdateEpisodes(
        $episodeUuid: UUID!
        $title: String
        $description: String
        $content: String
        $isLive: Boolean
      ) {
        updateEpisode(
          episodeUuid: $episodeUuid
          title: $title
          description: $description
          content: $content
          isLive: $isLive
        ) {
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

    // Only include fields that were actually provided
    const variables: Record<string, unknown> = { episodeUuid };
    if (updatedTitle !== undefined) variables['title'] = updatedTitle;
    if (updatedDescription !== undefined) variables['description'] = updatedDescription;
    if (updatedContent !== undefined) variables['content'] = updatedContent;
    if (isLive !== undefined) variables['isLive'] = isLive;

    return this.mutate<Response>({
      mutation: GQL,
      variables,
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

  uploadEpisodeAudio(episodeUuid: string, audioFile: File) {
    if (!episodeUuid) return throwError(() => new Error('Episode ID is required'));
    if (!audioFile) return throwError(() => new Error('Audio file is required'));

    const UPLOAD_EPISODE_AUDIO = gql`
      mutation UploadEpisodeAudio($episodeUuid: UUID!, $audioFile: Upload!) {
        uploadEpisodeAudio(episodeUuid: $episodeUuid, audioFile: $audioFile) {
          success
          message
          episode {
            id
            uuid
            date
            title
            description
            content
            currentVersionNumber
            audioUrl
            isLive
            podcastDate
            telegramDate
            versions {
              uuid
              versionNumber
              title
              description
              content
              audioUrl
              validatedCompliance
              validatedFacts
              validatedLength
              validationNotes
              changeType
              createdAt
              createdBy {
                id
                username
              }
            }
          }
        }
      }
    `;

    interface Response {
      uploadEpisodeAudio: {
        success: boolean;
        message: string;
        episode: Episode;
      };
    }

    return this.mutate<Response>({
      mutation: UPLOAD_EPISODE_AUDIO,
      variables: {
        episodeUuid,
        audioFile,
      },
      context: {
        useMultipart: true,
      },
    }).pipe(
      map((data) => {
        if (!data.uploadEpisodeAudio.success) {
          throw new Error(data.uploadEpisodeAudio.message);
        }
        return data.uploadEpisodeAudio;
      }),
    );
  }

  publishAudio(episodeUuid: string) {
    if (episodeUuid === null) return throwError(() => new Error('Episode ID is required'));

    const PUBLISH_EPISODE_AUDIO = gql`
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
      mutation: PUBLISH_EPISODE_AUDIO,
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

  deleteEpisode(episodeUuid: string) {
    if (!episodeUuid) return throwError(() => new Error('Episode ID is required'));

    const DELETE_EPISODE = gql`
      mutation DeleteEpisode($episodeUuid: UUID!) {
        deleteEpisode(episodeUuid: $episodeUuid) {
          success
          message
          episodeUuid
        }
      }
    `;

    interface Response {
      deleteEpisode: {
        success: boolean;
        message: string;
        episodeUuid: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_EPISODE,
      variables: { episodeUuid },
    }).pipe(
      map((data) => {
        if (!data.deleteEpisode.success) {
          throw new Error(data.deleteEpisode.message);
        }
        return data.deleteEpisode;
      }),
    );
  }

  validateEpisodeManual(episodeUuid: string) {
    if (!episodeUuid) return throwError(() => new Error('Episode ID is required'));

    const VALIDATE_EPISODE = gql`
      mutation ValidateEpisodeManual($episodeUuid: UUID!) {
        validateEpisodeManual(episodeUuid: $episodeUuid) {
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
      validateEpisodeManual: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: VALIDATE_EPISODE,
      variables: { episodeUuid },
    }).pipe(
      map((data) => {
        if (!data.validateEpisodeManual.success) {
          throw new Error(data.validateEpisodeManual.message);
        }
        return data.validateEpisodeManual;
      }),
    );
  }

  regenerateEpisode(episodeUuid: string) {
    if (!episodeUuid) return throwError(() => new Error('Episode ID is required'));

    const REGENERATE_EPISODE = gql`
      mutation RegenerateEpisode($episodeUuid: UUID!) {
        regenerateEpisode(episodeUuid: $episodeUuid) {
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
      regenerateEpisode: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: REGENERATE_EPISODE,
      variables: { episodeUuid },
    }).pipe(
      map((data) => {
        if (!data.regenerateEpisode.success) {
          throw new Error(data.regenerateEpisode.message);
        }
        return data.regenerateEpisode;
      }),
    );
  }

  revertEpisodeVersion(episodeUuid: string, versionNumber: number) {
    if (!episodeUuid) return throwError(() => new Error('Episode ID is required'));
    if (!versionNumber) return throwError(() => new Error('Version number is required'));

    const REVERT_VERSION = gql`
      mutation RevertEpisodeVersion($episodeUuid: UUID!, $versionNumber: Int!) {
        revertEpisodeVersion(episodeUuid: $episodeUuid, versionNumber: $versionNumber) {
          success
          message
          episode {
            uuid
            title
            description
            content
            currentVersionNumber
            audioUrl
            isLive
            versions {
              uuid
              versionNumber
              title
              description
              content
              audioUrl
              validatedCompliance
              validatedFacts
              validatedLength
              validationNotes
              changeType
              createdAt
              createdBy {
                id
                username
              }
            }
          }
        }
      }
    `;

    interface Response {
      revertEpisodeVersion: {
        success: boolean;
        message: string;
        episode: Episode;
      };
    }

    return this.mutate<Response>({
      mutation: REVERT_VERSION,
      variables: { episodeUuid, versionNumber },
    }).pipe(
      map((data) => {
        if (!data.revertEpisodeVersion.success) {
          throw new Error(data.revertEpisodeVersion.message);
        }
        return data.revertEpisodeVersion;
      }),
    );
  }
}
