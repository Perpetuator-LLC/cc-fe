import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { map } from 'rxjs/operators';
import { Job } from './job.service';
import { BaseService } from './base.service';
import { News } from './news/news.component';

@Injectable({
  providedIn: 'root',
})
export class NewsService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  fetchNews(teamId: number) {
    const FETCH_NEWS_DATA = gql`
      mutation FetchNews($teamId: ID!) {
        fetchNews(teamId: $teamId) {
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
      variables: { teamId: teamId },
    }).pipe(
      map((data) => {
        return data.fetchNews;
      }),
    );
  }

  getNews(teamId: number, hours = 24) {
    const GET_NEWS = gql`
      query GetNews($teamId: ID!, $hours: Int!) {
        getNews(teamId: $teamId, hours: $hours) {
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
      getNews: News;
    }

    return this.query<Response>({
      query: GET_NEWS,
      fetchPolicy: 'network-only',
      variables: { teamId, hours },
    }).pipe(
      map((data) => {
        return data.getNews;
      }),
    );
  }

  extractNews(teamId: number, ids: number[]) {
    const EXTRACT_NEWS_DATA = gql`
      mutation ExtractNews($teamId: ID!, $ids: [ID!]!) {
        extractNews(teamId: $teamId, ids: $ids) {
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
      variables: { teamId, ids },
    }).pipe(
      map((data) => {
        return data.extractNews;
      }),
    );
  }

  summarizeNews(teamId: number, ids: number[], force = false) {
    const SUMMARIZE_NEWS_DATA = gql`
      mutation SummarizeNewsData($teamId: ID!, $ids: [ID!]!, $force: Boolean!) {
        summarizeNews(teamId: $teamId, ids: $ids, force: $force) {
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
      variables: { teamId, ids, force },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.summarizeNews;
      }),
    );
  }

  createArticle(ids: number[], teamId: number) {
    const CREATE_ARTICLE_DATA = gql`
      mutation CreateArticleData($ids: [Int!]!, $teamId: ID!) {
        createArticle(ids: $ids, teamId: $teamId) {
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
      createArticle: {
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_DATA,
      variables: { ids, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createArticle;
      }),
    );
  }

  createArticleChain(newsIds: number[], teamId: number) {
    const CREATE_ARTICLE_CHAIN = gql`
      mutation CreateArticleChain($newsIds: [ID!]!, $teamId: ID!) {
        createArticleChain(newsIds: $newsIds, teamId: $teamId) {
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
      createArticleChain: {
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_CHAIN,
      variables: { newsIds, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createArticleChain;
      }),
    );
  }

  createArticleAudioChain(newsIds: number[], teamId: number) {
    const CREATE_ARTICLE_AUDIO_CHAIN = gql`
      mutation CreateArticleAudioChain($newsIds: [ID!]!, $teamId: ID!) {
        createArticleAudioChain(newsIds: $newsIds, teamId: $teamId) {
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
      createArticleAudioChain: {
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_AUDIO_CHAIN,
      variables: { newsIds, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.createArticleAudioChain;
      }),
    );
  }
}
