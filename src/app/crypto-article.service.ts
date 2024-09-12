import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import {
  CryptoArticlesData,
  UpdateCryptoArticleAudio,
  UpdateCryptoArticleData,
} from './article-detail/article-detail.component';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MessageService } from './message.service';

export interface UpdateCryptoArticleAudioResponse {
  errors?: [{ message: string }];
  data?: { updateCryptoArticleAudio: UpdateCryptoArticleAudio };
}

export interface UpdateCryptoArticleResponse {
  errors?: [{ message: string }];
  data?: { updateCryptoArticleData: UpdateCryptoArticleData };
}

export interface CryptoArticlesResponse {
  errors?: [{ message: string }];
  data?: { getCryptoArticlesData: CryptoArticlesData };
}

@Injectable({
  providedIn: 'root',
})
export class CryptoArticleService {
  constructor(
    private apollo: Apollo,
    private messageService: MessageService,
  ) {}

  getCryptoArticles(): Observable<CryptoArticlesData> {
    const GET_CRYPTO_ARTICLES_DATA = gql`
      query GetCryptoArticlesData {
        getCryptoArticlesData {
          success
          message
          results {
            id
            date
            content
            newsSummaries {
              id
              url
              summary
            }
          }
        }
      }
    `;

    return this.apollo
      .query<CryptoArticlesResponse>({
        query: GET_CRYPTO_ARTICLES_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          return result.data?.getCryptoArticlesData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  getCryptoArticleById(id: string | null): Observable<CryptoArticlesData> {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    const GET_CRYPTO_ARTICLE_DATA = gql`
      query GetCryptoArticleData {
        getCryptoArticleData(id: ${id}) {
          success
          message
          results {
            id
            date
            content
            audio
            newsSummaries {
              id
              url
              summary
            }
          }
        }
      }
    `;

    return this.apollo
      .query<CryptoArticlesResponse>({
        query: GET_CRYPTO_ARTICLE_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          if (!result.data || result.data.getCryptoArticleData.results.length === 0) {
            return { success: false, message: 'No data available', results: [] };
          }
          return result.data.getCryptoArticleData;
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  updateArticle(id: string | null, updatedContent: string | null): Observable<UpdateCryptoArticleData> {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    if (updatedContent === null) return throwError(() => new Error('Updated content is required'));

    const escapedContent = updatedContent
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\n/g, '\\n') // Escape new lines
      .replace(/\r/g, '\\r'); // Escape carriage returns

    const UPDATE_CRYPTO_ARTICLES_DATA = gql`
      mutation UpdateCryptoArticlesData {
        updateCryptoArticleData(id: "${id}", content: "${escapedContent}") {
          success
          message
        }
      }
    `;

    return this.apollo
      .mutate<UpdateCryptoArticleResponse>({
        mutation: UPDATE_CRYPTO_ARTICLES_DATA,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          this.messageService.addMessage({
            type: 'success',
            text: 'Crypto article updated successfully.',
            dismissible: true,
          });
          return result.data?.updateCryptoArticleData || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  generateAudio(id: string): Observable<UpdateCryptoArticleAudio> {
    if (id === null) return throwError(() => new Error('Article ID is required'));

    const UPDATE_CRYPTO_ARTICLES_AUDIO = gql`
      mutation UpdateCryptoArticlesAudio {
        updateCryptoArticleAudio(id: "${id}") {
          success
          message
        }
      }
    `;

    this.messageService.clearMessages();
    this.messageService.addMessage({
      type: 'info',
      text: 'Crypto article audio generating...',
      dismissible: true,
    });

    return this.apollo
      .mutate<UpdateCryptoArticleAudioResponse>({
        mutation: UPDATE_CRYPTO_ARTICLES_AUDIO,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          }
          return result.data?.updateCryptoArticleAudio || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }
}
