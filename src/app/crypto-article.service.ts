import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import {
  CryptoArticleData,
  CryptoArticlesData,
  PublishCryptoArticleAudio,
  UpdateCryptoArticleAudio,
  UpdateCryptoArticleData,
} from './article-detail/article-detail.component';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MessageService } from './message.service';
import { BaseService } from './base.service';

export interface UpdateCryptoArticleAudioResponse {
  errors?: [{ message: string }];
  data?: { updateCryptoArticleAudio: UpdateCryptoArticleAudio };
}

export interface PublishCryptoArticleAudioResponse {
  errors?: [{ message: string }];
  data?: { publishCryptoArticleAudio: PublishCryptoArticleAudio };
}

export interface UpdateCryptoArticleResponse {
  errors?: [{ message: string }];
  data?: { updateCryptoArticleData: UpdateCryptoArticleData };
}

export interface CryptoArticlesResponse {
  errors?: [{ message: string }];
  data?: { getCryptoArticlesData: CryptoArticlesData };
}

export interface CryptoArticleResponse {
  errors?: [{ message: string }];
  data?: { getCryptoArticleData: CryptoArticleData };
}

@Injectable({
  providedIn: 'root',
})
export class CryptoArticleService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    private messageService: MessageService,
  ) {
    super(apollo);
  }

  getCryptoArticles(orderBy = 'date', direction = 'DESC') {
    const GET_CRYPTO_ARTICLES_DATA = gql`
      query GetCryptoArticlesData($orderBy: String!, $direction: SortDirection!) {
        getCryptoArticlesData(orderBy: $orderBy, direction: $direction) {
          success
          message
          results {
            id
            date
            team {
              name
            }
            title
            content
            newsSummaries {
              id
              url
              title
              summary
            }
          }
        }
      }
    `;

    interface Response {
      getCryptoArticlesData: CryptoArticlesData;
    }

    return this.query<Response>({
      query: GET_CRYPTO_ARTICLES_DATA,
      variables: { orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getCryptoArticlesData.success) {
          throw new Error(data.getCryptoArticlesData.message);
        }
        return data.getCryptoArticlesData || { success: false, message: 'No data available', results: [] };
      }),
      catchError((error) => {
        console.error('GraphQL query error:', error);
        return throwError(() => new Error(error.message));
      }),
    );
  }

  getCryptoArticleById(id: string | null) {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    const GET_CRYPTO_ARTICLE_DATA = gql`
      query GetCryptoArticleData($id: ID!) {
        getCryptoArticleData(id: $id) {
          success
          message
          results {
            id
            date
            title
            content
            audio
            team {
              id
              name
              members {
                role
                user {
                  id
                  username
                }
              }
            }
            newsSummaries {
              id
              url
              title
              summary
            }
          }
        }
      }
    `;

    interface Response {
      getCryptoArticleData: CryptoArticleData;
    }

    return this.query<Response>({
      query: GET_CRYPTO_ARTICLE_DATA,
      variables: { id },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getCryptoArticleData.success) {
          throw new Error(data.getCryptoArticleData.message);
        }
        return data.getCryptoArticleData;
      }),
      catchError((error) => {
        console.error('GraphQL query error:', error);
        return throwError(() => new Error(error.message));
      }),
    );
  }

  updateArticle(
    id: string | null,
    updatedTitle: string | null,
    updatedContent: string | null,
  ): Observable<UpdateCryptoArticleData> {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    if (updatedTitle === null) return throwError(() => new Error('Updated title is required'));
    if (updatedContent === null) return throwError(() => new Error('Updated content is required'));

    const escapedContent = updatedContent
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\n/g, '\\n') // Escape new lines
      .replace(/\r/g, '\\r'); // Escape carriage returns

    const UPDATE_CRYPTO_ARTICLES_DATA = gql`
      mutation UpdateCryptoArticlesData {
        updateCryptoArticleData(id: "${id}", title: "${updatedTitle}", content: "${escapedContent}") {
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
          } else if (!result.data?.updateCryptoArticleData.success) {
            throw new Error(result.data?.updateCryptoArticleData.message);
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
          } else if (result.data?.updateCryptoArticleAudio.success !== true) {
            throw new Error(result.data?.updateCryptoArticleAudio.message);
          }
          return result.data?.updateCryptoArticleAudio || { success: false, message: 'No data available', results: [] };
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  publishAudio(id: string): Observable<PublishCryptoArticleAudio> {
    if (id === null) return throwError(() => new Error('Article ID is required'));

    const PUBLISH_CRYPTO_ARTICLE_AUDIO = gql`
      mutation UpdateCryptoArticleAudio {
        publishCryptoArticleAudio(id: "${id}") {
          success
          message
        }
      }
    `;

    this.messageService.clearMessages();
    this.messageService.addMessage({
      type: 'info',
      text: 'Crypto article audio publishing...',
      dismissible: true,
    });

    return this.apollo
      .mutate<PublishCryptoArticleAudioResponse>({
        mutation: PUBLISH_CRYPTO_ARTICLE_AUDIO,
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data?.publishCryptoArticleAudio.success) {
            throw new Error(result.data?.publishCryptoArticleAudio.message);
          }
          return (
            result.data?.publishCryptoArticleAudio || { success: false, message: 'No data available', results: [] }
          );
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }
}
