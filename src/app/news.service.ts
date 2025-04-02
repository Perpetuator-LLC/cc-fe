// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Job } from './job.service';
import { BaseService } from './base.service';
import { News } from './news/news.component';
import { ErrorHandlerService } from './error-handler.service';

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

  fetchNews(podcastId: number) {
    const FETCH_NEWS_DATA = gql`
      mutation FetchNews($podcastId: ID!) {
        fetchNews(podcastId: $podcastId) {
          job {
            id
            jobType
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
      variables: { podcastId: podcastId },
    }).pipe(
      map((data) => {
        return data.fetchNews;
      }),
    );
  }

  news(podcastId: number, hours = 24) {
    const GET_NEWS = gql`
      query GetNews($podcastId: ID!, $hours: Int!) {
        news(podcastId: $podcastId, hours: $hours) {
          results {
            id
            title
            description
            url
            publishedAt
            source
            content
            summary
          }
        }
      }
    `;

    interface Response {
      news: News;
    }

    return this.query<Response>({
      query: GET_NEWS,
      fetchPolicy: 'network-only',
      variables: { podcastId, hours },
    }).pipe(
      map((data) => {
        return data.news;
      }),
    );
  }

  extractNews(podcastId: number, ids: number[]) {
    const EXTRACT_NEWS_DATA = gql`
      mutation ExtractNews($podcastId: ID!, $ids: [ID!]!) {
        extractNews(podcastId: $podcastId, newsIds: $ids) {
          job {
            id
            jobType
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
      variables: { podcastId, ids },
    }).pipe(
      map((data) => {
        return data.extractNews;
      }),
    );
  }

  summarizeNews(podcastId: number, ids: number[], force = false) {
    const SUMMARIZE_NEWS_DATA = gql`
      mutation SummarizeNewsData($podcastId: ID!, $ids: [ID!]!, $force: Boolean!) {
        summarizeNews(podcastId: $podcastId, newsIds: $ids, force: $force) {
          job {
            id
            jobType
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
      variables: { podcastId, ids, force },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.summarizeNews;
      }),
    );
  }

  createEpisode(ids: number[], podcastId: number) {
    const CREATE_ARTICLE_DATA = gql`
      mutation CreateEpisodeData($ids: [Int!]!, $podcastId: ID!) {
        createEpisode(newsIds: $ids, podcastId: $podcastId) {
          job {
            id
            jobType
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
      variables: { ids, podcastId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createEpisode;
      }),
    );
  }

  createEpisodeChain(newsIds: number[], podcastId: number) {
    const CREATE_ARTICLE_CHAIN = gql`
      mutation CreateEpisodeChain($newsIds: [ID!]!, $podcastId: ID!) {
        createEpisodeChain(newsIds: $newsIds, podcastId: $podcastId) {
          jobs {
            id
            jobType
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
      variables: { newsIds, podcastId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createEpisodeChain;
      }),
    );
  }

  createEpisodeAudioChain(newsIds: number[], podcastId: number) {
    const CREATE_ARTICLE_AUDIO_CHAIN = gql`
      mutation CreateEpisodeAudioChain($newsIds: [ID!]!, $podcastId: ID!) {
        createEpisodeAudioChain(newsIds: $newsIds, podcastId: $podcastId) {
          jobs {
            id
            jobType
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
      variables: { newsIds, podcastId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createEpisodeAudioChain;
      }),
    );
  }
}
