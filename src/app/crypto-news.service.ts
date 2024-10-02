import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoNewsData } from './crypto-news/crypto-news.component';
import { CryptoArticleResponse } from './crypto-article.service';
import { CryptoArticleData } from './article-detail/article-detail.component';

export interface CryptoNewsResponse {
  errors?: [{ message: string }];
  data?: { getCryptoNewsData: CryptoNewsData };
}

@Injectable({
  providedIn: 'root',
})
export class CryptoNewsService {
  constructor(private apollo: Apollo) {}

  fetchCryptoNews(): Observable<CryptoNewsData> {
    const FETCH_CRYPTO_NEWS_DATA = gql`
      mutation FetchCryptoNewsData {
        fetchCryptoNewsData {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<CryptoNewsResponse>({
        mutation: FETCH_CRYPTO_NEWS_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          return result.data?.getCryptoNewsData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
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

    return this.apollo
      .query<CryptoNewsResponse>({
        query: GET_CRYPTO_NEWS_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data?.getCryptoNewsData.success) {
            throw new Error(result.data?.getCryptoNewsData.message);
          }
          return result.data?.getCryptoNewsData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  extractCryptoNews(ids: number[]): Observable<CryptoNewsData> {
    const EXTRACT_CRYPTO_NEWS_DATA = gql`
      mutation {
        extractCryptoNewsData(ids: [${ids.join(' ')}]) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<{ extractCryptoNewsData: CryptoNewsResponse }>({
        mutation: EXTRACT_CRYPTO_NEWS_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data?.extractCryptoNewsData.success) {
            throw new Error(result.data?.extractCryptoNewsData.message);
          }
          return result.data?.extractCryptoNewsData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  summarizeCryptoNews(ids: number[], force = false): Observable<CryptoNewsData> {
    const SUMMARIZE_CRYPTO_NEWS_DATA = gql`
      mutation {
        summarizeCryptoNewsData(ids: [${ids.join(' ')}], force: ${force}) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<{ summarizeCryptoNewsData: CryptoNewsResponse }>({
        mutation: SUMMARIZE_CRYPTO_NEWS_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data?.summarizeCryptoNewsData.success) {
            throw new Error(result.data?.summarizeCryptoNewsData.message);
          }
          return result.data?.summarizeCryptoNewsData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  createCryptoArticle(ids: number[], teamId: number): Observable<CryptoArticleData> {
    const CREATE_CRYPTO_ARTICLE_DATA = gql`
      mutation {
        createCryptoArticleData(ids: [${ids.join(' ')}], teamId: ${teamId}) {
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

    return this.apollo
      .mutate<{ createCryptoArticleData: CryptoArticleResponse }>({
        mutation: CREATE_CRYPTO_ARTICLE_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data?.createCryptoArticleData.success) {
            throw new Error(result.data?.createCryptoArticleData.message);
          }
          return result.data?.createCryptoArticleData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL mutation error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }
}
