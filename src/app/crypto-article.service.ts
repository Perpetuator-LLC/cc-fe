import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import {
  PublishCryptoArticleAudio,
  UpdateCryptoArticleAudio,
  UpdateCryptoArticleData,
} from './article-detail/article-detail.component';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MessageService } from './message.service';
import { BaseService } from './base.service';
import { TeamsResult } from './teams-list/teams-list.component';
import { CryptoNewsResult } from './crypto-news/crypto-news.component';

export interface UpdateCryptoArticleAudioResponse {
  errors?: [{ message: string }];
  data?: { updateCryptoArticleAudio: UpdateCryptoArticleAudio };
}

export interface PublishCryptoArticleAudioResponse {
  errors?: [{ message: string }];
  data?: { publishCryptoArticleAudio: PublishCryptoArticleAudio };
}

export interface Article {
  id: string;
  date: string;
  title: string;
  content: string;
  audio: string;
  newsSummaries: CryptoNewsResult[];
  team: TeamsResult;
  // newsSummaries: CryptoNewsSummary[];
}

export interface CryptoArticlesData {
  success: boolean;
  message: string;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  articles: Article[];
}

export interface CryptoArticleData {
  success: boolean;
  message: string;
  results: Article;
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

  getCryptoArticles(page = 1, pageSize = 10, orderBy = 'date', direction = 'DESC') {
    const GQL = gql`
      query GetCryptoArticlesData($page: Int!, $pageSize: Int!, $orderBy: String!, $direction: SortDirection!) {
        getCryptoArticles(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction) {
          success
          message
          totalRecords
          totalPages
          currentPage
          hasNext
          hasPrevious
          articles {
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
      getCryptoArticles: CryptoArticlesData;
    }

    return this.query<Response>({
      query: GQL,
      variables: { page, pageSize, orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getCryptoArticles.success) {
          throw new Error(data.getCryptoArticles.message);
        }
        return data.getCryptoArticles;
      }),
      catchError((error) => {
        console.error('GraphQL query error:', error);
        return throwError(() => new Error(error.message));
      }),
    );
  }

  getCryptoArticleById(id: string | null) {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    const GQL = gql`
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
      query: GQL,
      variables: { id },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getCryptoArticleData.success) {
          throw new Error(data.getCryptoArticleData.message);
        }
        return data.getCryptoArticleData;
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

    const GQL = gql`
      mutation UpdateCryptoArticlesData($id: ID!, $title: String!, $content: String!) {
        updateCryptoArticleData(id: $id, title: $title, content: $content) {
          success
          message
        }
      }
    `;

    interface Response {
      updateCryptoArticle: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { id, title: updatedTitle, content: updatedContent },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.updateCryptoArticle.success) {
          throw new Error(data.updateCryptoArticle.message);
        }
        this.messageService.success('Crypto article updated successfully.');
        return data.updateCryptoArticle;
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
