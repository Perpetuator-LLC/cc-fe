import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { TeamsResult } from './teams-list/teams-list.component';
import { CryptoNewsResult } from './crypto-news/crypto-news.component';
import { Job } from './job.service';

export interface Article {
  id: string;
  date: string;
  title: string;
  content: string;
  audioBase64: string;
  isLive: boolean;
  podcastDate: string;
  telegramDate: string;
  newsSummaries: CryptoNewsResult[];
  team: TeamsResult;
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
  article: Article;
}

@Injectable({
  providedIn: 'root',
})
export class CryptoArticleService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  getCryptoArticles(page = 1, pageSize = 10, orderBy = 'date', direction = 'DESC', teamId: string | null = null) {
    const GQL = gql`
      query GetCryptoArticlesData(
        $page: Int!
        $pageSize: Int!
        $orderBy: String!
        $direction: SortDirection!
        $teamId: ID
      ) {
        getCryptoArticles(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction, teamId: $teamId) {
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
      variables: { page, pageSize, orderBy, direction, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getCryptoArticles.success) {
          throw new Error(data.getCryptoArticles.message);
        }
        return data.getCryptoArticles;
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
          article {
            id
            date
            title
            content
            audioBase64
            isLive
            podcastDate
            telegramDate
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
    isLive: boolean | null,
  ): Observable<CryptoArticleData> {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    if (updatedTitle === null) return throwError(() => new Error('Updated title is required'));
    if (updatedContent === null) return throwError(() => new Error('Updated content is required'));
    if (isLive === null) return throwError(() => new Error('Updated is live is required'));

    const GQL = gql`
      mutation UpdateCryptoArticles($id: ID!, $title: String!, $content: String!, $isLive: Boolean!) {
        updateCryptoArticle(id: $id, title: $title, content: $content, isLive: $isLive) {
          success
          message
        }
      }
    `;

    interface Response {
      updateCryptoArticle: CryptoArticleData;
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { id, title: updatedTitle, content: updatedContent, isLive: isLive },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.updateCryptoArticle.success) {
          throw new Error(data.updateCryptoArticle.message);
        }
        return data.updateCryptoArticle;
      }),
    );
  }

  generateAudio(id: string) {
    if (id === null) return throwError(() => new Error('Article ID is required'));

    const GQL = gql`
      mutation UpdateCryptoArticlesAudio {
        updateCryptoArticleAudio(articleId: "${id}") {
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
      updateCryptoArticleAudio: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.updateCryptoArticleAudio.success) {
          throw new Error(data.updateCryptoArticleAudio.message);
        }
        return data.updateCryptoArticleAudio;
      }),
    );
  }

  publishAudio(articleId: string) {
    if (articleId === null) return throwError(() => new Error('Article ID is required'));

    const GQL = gql`
      mutation PublishCryptoArticleAudio($id: ID!) {
        publishCryptoArticleAudio(articleId: $id) {
          success
          message
          article {
            id
            date
            title
            content
            audioBase64
            isLive
            podcastDate
            telegramDate
          }
        }
      }
    `;

    interface Response {
      publishCryptoArticleAudio: {
        success: boolean;
        message: string;
        article: Article;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { id: articleId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.publishCryptoArticleAudio.success) {
          throw new Error(data.publishCryptoArticleAudio.message);
        }
        return data.publishCryptoArticleAudio;
      }),
    );
  }
}
