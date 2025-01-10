import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { TeamsResult } from './teams-list/teams-list.component';
import { NewsResult } from './news/news.component';
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
  newsSummaries: NewsResult[];
  team: TeamsResult;
}

export interface ArticlesData {
  success: boolean;
  message: string;
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  articles: Article[];
}

export interface ArticleData {
  success: boolean;
  message: string;
  article: Article;
}

@Injectable({
  providedIn: 'root',
})
export class ArticleService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  getArticles(page = 1, pageSize = 10, orderBy = 'date', direction = 'DESC', teamId: string | null = null) {
    const GQL = gql`
      query GetArticlesData($page: Int!, $pageSize: Int!, $orderBy: String!, $direction: SortDirection!, $teamId: ID) {
        getArticles(page: $page, pageSize: $pageSize, orderBy: $orderBy, direction: $direction, teamId: $teamId) {
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
      getArticles: ArticlesData;
    }

    return this.query<Response>({
      query: GQL,
      variables: { page, pageSize, orderBy, direction, teamId },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getArticles.success) {
          throw new Error(data.getArticles.message);
        }
        return data.getArticles;
      }),
    );
  }

  getArticleById(id: string | null) {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    const GQL = gql`
      query GetArticleData($id: ID!) {
        getArticleData(id: $id) {
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
      getArticleData: ArticleData;
    }

    return this.query<Response>({
      query: GQL,
      variables: { id },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getArticleData.success) {
          throw new Error(data.getArticleData.message);
        }
        return data.getArticleData;
      }),
    );
  }

  updateArticle(
    id: string | null,
    updatedTitle: string | null,
    updatedContent: string | null,
    isLive: boolean | null,
  ): Observable<ArticleData> {
    if (id === null) return throwError(() => new Error('Article ID is required'));
    if (updatedTitle === null) return throwError(() => new Error('Updated title is required'));
    if (updatedContent === null) return throwError(() => new Error('Updated content is required'));
    if (isLive === null) return throwError(() => new Error('Updated is live is required'));

    const GQL = gql`
      mutation UpdateArticles($id: ID!, $title: String!, $content: String!, $isLive: Boolean!) {
        updateArticle(id: $id, title: $title, content: $content, isLive: $isLive) {
          success
          message
        }
      }
    `;

    interface Response {
      updateArticle: ArticleData;
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { id, title: updatedTitle, content: updatedContent, isLive: isLive },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.updateArticle.success) {
          throw new Error(data.updateArticle.message);
        }
        return data.updateArticle;
      }),
    );
  }

  generateAudio(id: string) {
    if (id === null) return throwError(() => new Error('Article ID is required'));

    const GQL = gql`
      mutation UpdateArticlesAudio {
        updateArticleAudio(articleId: "${id}") {
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
      updateArticleAudio: {
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
        if (!data.updateArticleAudio.success) {
          throw new Error(data.updateArticleAudio.message);
        }
        return data.updateArticleAudio;
      }),
    );
  }

  publishAudio(articleId: string) {
    if (articleId === null) return throwError(() => new Error('Article ID is required'));

    const GQL = gql`
      mutation PublishArticleAudio($id: ID!) {
        publishArticleAudio(articleId: $id) {
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
      publishArticleAudio: {
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
        if (!data.publishArticleAudio.success) {
          throw new Error(data.publishArticleAudio.message);
        }
        return data.publishArticleAudio;
      }),
    );
  }
}
