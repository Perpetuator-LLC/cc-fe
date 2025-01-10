import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NewsData } from './news/news.component';
import { Job } from './job.service';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class NewsService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  fetchNewsData() {
    const FETCH_NEWS_DATA = gql`
      mutation {
        fetchNewsData {
          success
          message
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
      fetchNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: FETCH_NEWS_DATA,
    }).pipe(
      map((data) => {
        if (!data.fetchNewsData.success) {
          throw new Error(data.fetchNewsData.message);
        }
        return data.fetchNewsData;
      }),
    );
  }

  getNews(): Observable<NewsData> {
    const GET_NEWS_DATA = gql`
      query GetNewsData {
        getNewsData {
          success
          message
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
      getNewsData: NewsData;
    }

    return this.query<Response>({
      query: GET_NEWS_DATA,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getNewsData.success) {
          throw new Error(data.getNewsData.message);
        }
        return data.getNewsData;
      }),
    );
  }

  extractNews(ids: number[]) {
    const EXTRACT_NEWS_DATA = gql`
      mutation {
        extractNewsData(ids: [${ids.join(' ')}]) {
          success
          message
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
      extractNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: EXTRACT_NEWS_DATA,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.extractNewsData.success) {
          throw new Error(data.extractNewsData.message);
        }
        return data.extractNewsData;
      }),
    );
  }

  summarizeNews(ids: number[], force = false) {
    const SUMMARIZE_NEWS_DATA = gql`
      mutation SummarizeNewsData($ids: [Int!]!, $force: Boolean!) {
        summarizeNewsData(ids: $ids, force: $force) {
          success
          message
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
      summarizeNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: SUMMARIZE_NEWS_DATA,
      variables: { ids, force },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.summarizeNewsData.success) {
          throw new Error(data.summarizeNewsData.message);
        }
        return data.summarizeNewsData;
      }),
    );
  }

  createArticle(ids: number[], teamId: number) {
    const CREATE_ARTICLE_DATA = gql`
      mutation CreateArticleData($ids: [Int!]!, $teamId: ID!) {
        createArticleData(ids: $ids, teamId: $teamId) {
          success
          message
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
      createArticleData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_DATA,
      variables: { ids, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.createArticleData.success) {
          throw new Error(data.createArticleData.message);
        }
        return data.createArticleData;
      }),
    );
  }

  createArticleChain(newsIds: number[], teamId: number) {
    const CREATE_ARTICLE_CHAIN = gql`
      mutation CreateArticleChain($newsIds: [ID!]!, $teamId: ID!) {
        createArticleChain(newsIds: $newsIds, teamId: $teamId) {
          success
          message
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
        success: boolean;
        message: string;
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_ARTICLE_CHAIN,
      variables: { newsIds, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.createArticleChain.success) {
          throw new Error(data.createArticleChain.message);
        }
        return data.createArticleChain;
      }),
    );
  }
}
