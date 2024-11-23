import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoNewsData } from './crypto-news/crypto-news.component';
import { Job } from './job.service';
import { BaseService } from './base.service';
import { CryptoArticleData } from './article-detail/article-detail.component';

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
        return data.getCryptoNewsData || { success: false, message: 'No data available', results: [] };
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
        return data.extractCryptoNewsData || { success: false, message: 'No data available', results: [] };
      }),
    );
  }

  summarizeCryptoNews(ids: number[], force = false) {
    const SUMMARIZE_CRYPTO_NEWS_DATA = gql`
      mutation {
        summarizeCryptoNewsData(ids: [${ids.join(' ')}], force: ${force}) {
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

  createCryptoArticle(ids: number[], teamId: number): Observable<CryptoArticleData> {
    // TODO: when we upgrade this, before we restart celery, see if we can get the error messages from there and
    //  display them here. This is a different process but I think Redis can be used to get the error messages.
    const CREATE_CRYPTO_ARTICLE_DATA = gql`
      mutation {
        createCryptoArticleData(ids: [${ids.join(' ')}], teamId: ${teamId!}) {
          success
          message
          results {
            id
            date
            title
            content
            audio
            newsSummaries {
              id
              title
              summary
              url
            }
          }
        }
      }
    `;

    interface Response {
      createCryptoArticleData: CryptoArticleData;
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
        return data.createCryptoArticleData || { success: false, message: 'No data available', results: [] };
      }),
      catchError((error) => {
        console.error('GraphQL mutation error:', error);
        return throwError(() => new Error(error.message));
      }),
    );
  }
}
