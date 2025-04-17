// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Job } from './job.service';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { PageInfo, RelayEdge } from './utils/relay';

export interface NewsResult {
  id: string;
  uuid: string;
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  content: string;
  summary: string;
}

export interface NewsConnection {
  edges: RelayEdge<NewsResult>[];
  pageInfo: PageInfo;
}

@Injectable({
  providedIn: 'root',
})
export class NewsService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  fetchNews(podcastUuid: string) {
    const FETCH_NEWS_DATA = gql`
      mutation FetchNews($podcastUuid: UUID!) {
        fetchNews(podcastUuid: $podcastUuid) {
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
      fetchNews: {
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: FETCH_NEWS_DATA,
      variables: { podcastUuid },
    }).pipe(
      map((data) => {
        return data.fetchNews;
      }),
    );
  }

  news(podcastUuid: string, hours = 24) {
    const GET_NEWS = gql`
      query GetNews($podcastUuid: UUID!, $hours: Int!) {
        news(podcastUuid: $podcastUuid, hours: $hours) {
          edges {
            cursor
            node {
              id
              uuid
              title
              description
              url
              publishedAt
              source
              content
              summary
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
      news: NewsConnection;
    }

    return this.query<Response>({
      query: GET_NEWS,
      fetchPolicy: 'network-only',
      variables: { podcastUuid, hours },
    }).pipe(
      map((data) => {
        return data.news;
      }),
    );
  }

  extractNews(podcastUuid: string, newsUuids: string[]) {
    const EXTRACT_NEWS_DATA = gql`
      mutation ExtractNews($podcastUuid: UUID!, $newsUuids: [UUID!]!) {
        extractNews(podcastUuid: $podcastUuid, newsUuids: $newsUuids) {
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
      extractNews: {
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: EXTRACT_NEWS_DATA,
      variables: { podcastUuid, newsUuids },
    }).pipe(
      map((data) => {
        return data.extractNews;
      }),
    );
  }

  summarizeNews(podcastUuid: string, newsUuids: string[], force = false) {
    const SUMMARIZE_NEWS_DATA = gql`
      mutation SummarizeNewsData($podcastUuid: UUID!, $newsUuids: [UUID!]!, $force: Boolean!) {
        summarizeNews(podcastUuid: $podcastUuid, newsUuids: $newsUuids, force: $force) {
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
      summarizeNews: {
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: SUMMARIZE_NEWS_DATA,
      variables: { podcastUuid, newsUuids, force },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.summarizeNews;
      }),
    );
  }

  createEpisode(newsUuids: string[], podcastUuid: string) {
    const CREATE_ARTICLE_DATA = gql`
      mutation CreateEpisodeData($newsUuids: [UUID!]!, $podcastUuid: UUID!) {
        createEpisode(newsUuids: $newsUuids, podcastUuid: $podcastUuid) {
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
      createEpisode: {
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_DATA,
      variables: { newsUuids, podcastUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createEpisode;
      }),
    );
  }

  createEpisodeChain(newsUuids: string[], podcastUuid: string) {
    const CREATE_ARTICLE_CHAIN = gql`
      mutation CreateEpisodeChain($newsUuids: [UUID!]!, $podcastUuid: UUID!) {
        createEpisodeChain(newsUuids: $newsUuids, podcastUuid: $podcastUuid) {
          jobs {
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
      createEpisodeChain: {
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_CHAIN,
      variables: { newsUuids, podcastUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createEpisodeChain;
      }),
    );
  }

  createEpisodeAudioChain(newsUuids: string[], podcastUuid: string) {
    const CREATE_ARTICLE_AUDIO_CHAIN = gql`
      mutation CreateEpisodeAudioChain($newsUuids: [UUID!]!, $podcastUuid: UUID!) {
        createEpisodeAudioChain(newsUuids: $newsUuids, podcastUuid: $podcastUuid) {
          jobs {
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
      createEpisodeAudioChain: {
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_AUDIO_CHAIN,
      variables: { newsUuids, podcastUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createEpisodeAudioChain;
      }),
    );
  }
}
