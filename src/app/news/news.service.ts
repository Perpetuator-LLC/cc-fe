// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Job } from '../jobs/job.service';
import { BaseService } from '../base.service';
import { PageInfo, RelayEdge } from '../utils/relay';

export interface NewsTag {
  kind: string;
  value: string;
}

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
  validatedSummary?: string;
  blocked: boolean;
  categories?: string[];
  tags?: NewsTag[];
  rssFeeds: {
    id: string;
    uuid: string;
    url: string;
    name?: string | null;
    isReachable: boolean;
    isParsable: boolean;
    lastFetchAttempt?: string | null;
  }[];
}

export interface NewsConnection {
  edges: RelayEdge<NewsResult>[];
  pageInfo: PageInfo;
}

@Injectable({
  providedIn: 'root',
})
export class NewsService extends BaseService {
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

  news(podcastUuid: string, hours = 24, first = 100, after: string | null = null, rssFeedUuid: string | null = null) {
    const GET_NEWS = gql`
      query GetNews($podcastUuid: UUID!, $hours: Int!, $first: Int!, $after: String, $rssFeedUuid: UUID) {
        news(podcastUuid: $podcastUuid, hours: $hours, first: $first, after: $after, rssFeedUuid: $rssFeedUuid) {
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
              validatedSummary
              blocked
              categories
              tags
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
      variables: { podcastUuid, hours, first, after, rssFeedUuid },
    }).pipe(
      map((data) => {
        // Parse GenericScalar fields that might come as JSON strings
        return {
          ...data.news,
          edges: data.news.edges.map((edge) => ({
            ...edge,
            node: this.parseNewsItem(edge.node),
          })),
        };
      }),
    );
  }

  private parseNewsItem(news: NewsResult): NewsResult {
    const parsed = { ...news };

    // Parse categories if it's a JSON string (GenericScalar field)
    if (news.categories) {
      if (typeof (news.categories as unknown) === 'string') {
        try {
          parsed.categories = JSON.parse(news.categories as unknown as string);
        } catch (e) {
          console.warn('Failed to parse categories:', e);
          parsed.categories = [];
        }
      }
    }

    // Parse tags if it's a JSON string (GenericScalar field)
    if (news.tags) {
      if (typeof (news.tags as unknown) === 'string') {
        try {
          parsed.tags = JSON.parse(news.tags as unknown as string);
        } catch (e) {
          console.warn('Failed to parse tags:', e);
          parsed.tags = [];
        }
      }
    }

    return parsed;
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

  processNewsChain(podcastUuid: string, newsUuids: string[]) {
    const PROCESS_NEWS_CHAIN = gql`
      mutation ProcessNewsChain($podcastUuid: UUID!, $newsUuids: [UUID!]!) {
        processNewsChain(podcastUuid: $podcastUuid, newsUuids: $newsUuids) {
          jobs {
            id
            uuid
            kind
            status
            error
            result
            args
            createdAt
            updatedAt
            cost
          }
        }
      }
    `;

    interface Response {
      processNewsChain: {
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: PROCESS_NEWS_CHAIN,
      variables: { podcastUuid, newsUuids },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.processNewsChain;
      }),
    );
  }
}
