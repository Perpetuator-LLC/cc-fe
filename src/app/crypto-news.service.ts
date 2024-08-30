import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CryptoNewsData } from './crypto-news/crypto-news.component';

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
          return throwError(() => new Error('Failed to fetch crypto news data: ' + error.message));
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
          }
          return result.data?.getCryptoNewsData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error('Failed to fetch crypto news data: ' + error.message));
        }),
      );
  }

  summarizeCryptoNews(ids: number[]): Observable<CryptoNewsData> {
    const SUMMARIZE_CRYPTO_NEWS_DATA = gql`
      mutation SummarizeCryptoNewsData {
        summarizeCryptoNewsData(ids: [${ids.join(' ')}]) {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<CryptoNewsResponse>({
        mutation: SUMMARIZE_CRYPTO_NEWS_DATA,
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
          return throwError(() => new Error('Failed to fetch crypto news data: ' + error.message));
        }),
      );
  }
}
