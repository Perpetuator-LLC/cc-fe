import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoNewsData } from './crypto-news/crypto-news.component';
import { Job } from './job.service';
import { BaseService } from './base.service';

@Injectable({
  providedIn: 'root',
})
export class CryptoNewsService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  fetchCryptoNewsData() {
    const FETCH_CRYPTO_NEWS_DATA = gql`
      mutation {
        fetchCryptoNewsData {
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
      fetchCryptoNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: FETCH_CRYPTO_NEWS_DATA,
    }).pipe(
      map((data) => {
        if (!data.fetchCryptoNewsData.success) {
          throw new Error(data.fetchCryptoNewsData.message);
        }
        return data.fetchCryptoNewsData;
      }),
    );
  }

  getCryptoNews(): Observable<CryptoNewsData> {
    const GET_CRYPTO_NEWS_DATA = gql`
      query GetCryptoNewsData {
        getCryptoNewsData {
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
      getCryptoNewsData: CryptoNewsData;
    }

    return this.query<Response>({
      query: GET_CRYPTO_NEWS_DATA,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getCryptoNewsData.success) {
          throw new Error(data.getCryptoNewsData.message);
        }
        return data.getCryptoNewsData;
      }),
      catchError((error) => {
        console.error('GraphQL query error:', error);
        return throwError(() => new Error(error.message));
      }),
    );
  }

  extractCryptoNews(ids: number[]) {
    const EXTRACT_CRYPTO_NEWS_DATA = gql`
      mutation {
        extractCryptoNewsData(ids: [${ids.join(' ')}]) {
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
      extractCryptoNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: EXTRACT_CRYPTO_NEWS_DATA,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.extractCryptoNewsData.success) {
          throw new Error(data.extractCryptoNewsData.message);
        }
        return data.extractCryptoNewsData;
      }),
    );
  }

  summarizeCryptoNews(ids: number[], force = false) {
    const SUMMARIZE_CRYPTO_NEWS_DATA = gql`
      mutation SummarizeCryptoNewsData($ids: [Int!]!, $force: Boolean!) {
        summarizeCryptoNewsData(ids: $ids, force: $force) {
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
      summarizeCryptoNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: SUMMARIZE_CRYPTO_NEWS_DATA,
      variables: { ids, force },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.summarizeCryptoNewsData.success) {
          throw new Error(data.summarizeCryptoNewsData.message);
        }
        return data.summarizeCryptoNewsData;
      }),
    );
  }

  createCryptoArticle(ids: number[], teamId: number) {
    const CREATE_CRYPTO_ARTICLE_DATA = gql`
      mutation CreateCryptoArticleData($ids: [Int!]!, $teamId: ID!) {
        createCryptoArticleData(ids: $ids, teamId: $teamId) {
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
      createCryptoArticleData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_CRYPTO_ARTICLE_DATA,
      variables: { ids, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.createCryptoArticleData.success) {
          throw new Error(data.createCryptoArticleData.message);
        }
        return data.createCryptoArticleData;
      }),
    );
  }

  createCryptoArticleChain(newsIds: number[], teamId: number) {
    const CREATE_CRYPTO_ARTICLE_CHAIN = gql`
      mutation CreateCryptoArticleChain($newsIds: [ID!]!, $teamId: ID!) {
        createCryptoArticleChain(newsIds: $newsIds, teamId: $teamId) {
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
      createCryptoArticleChain: {
        success: boolean;
        message: string;
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: CREATE_CRYPTO_ARTICLE_CHAIN,
      variables: { newsIds, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.createCryptoArticleChain.success) {
          throw new Error(data.createCryptoArticleChain.message);
        }
        return data.createCryptoArticleChain;
      }),
    );
  }
}
