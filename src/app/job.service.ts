import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { Apollo } from 'apollo-angular';

// create an enum of jobTypes
export enum JobType {
  FETCH_CRYPTO_NEWS = 'fetch_crypto_news',
  EXTRACT_CRYPTO_NEWS = 'extract_crypto_news',
  SUMMARIZE_CRYPTO_NEWS = 'summarize_crypto_news',
  CREATE_CRYPTO_ARTICLE = 'create_crypto_article',
  UPDATE_CRYPTO_ARTICLE_AUDIO = 'update_crypto_article_audio',
}

// create a function to convert string to jobType
export const stringToJobType = (jobType: string) => {
  switch (jobType) {
    case 'fetch_crypto_news':
      return JobType.FETCH_CRYPTO_NEWS;
    case 'extract_crypto_news':
      return JobType.EXTRACT_CRYPTO_NEWS;
    case 'summarize_crypto_news':
      return JobType.SUMMARIZE_CRYPTO_NEWS;
    case 'create_crypto_article':
      return JobType.CREATE_CRYPTO_ARTICLE;
    case 'update_crypto_article_audio':
      return JobType.UPDATE_CRYPTO_ARTICLE_AUDIO;
    default:
      throw new Error('Invalid job type');
  }
};

export const jobTypeToString = (jobType: string) => {
  switch (jobType) {
    case JobType.FETCH_CRYPTO_NEWS:
      return 'Fetch Crypto News';
    case JobType.EXTRACT_CRYPTO_NEWS:
      return 'Extract News';
    case JobType.SUMMARIZE_CRYPTO_NEWS:
      return 'Summarize News';
    case JobType.CREATE_CRYPTO_ARTICLE:
      return 'Create Article';
    case JobType.UPDATE_CRYPTO_ARTICLE_AUDIO:
      return 'Update Article Audio';
    default:
      return '';
  }
};

// create an enum of job statuses
export enum JobStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Job {
  id: string;
  jobType: string;
  status: string;
  error: string;
  result: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class JobService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  getUserJobs(
    statuses: string[] = [],
    jobTypes: string[] = [],
    ids: string[] = [],
    page = 1,
    pageSize = 10,
    orderBy = 'createdAt',
    direction = 'DESC',
  ) {
    const FETCH_USER_JOBS = gql`
      query GetUserJobs(
        $statuses: [String!]!
        $jobTypes: [String!]
        $ids: [UUID!]
        $page: Int!
        $pageSize: Int!
        $orderBy: String
        $direction: SortDirection
      ) {
        getUserJobs(
          statuses: $statuses
          jobTypes: $jobTypes
          ids: $ids
          page: $page
          pageSize: $pageSize
          orderBy: $orderBy
          direction: $direction
        ) {
          success
          message
          totalRecords
          totalPages
          currentPage
          hasNext
          hasPrevious
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
      getUserJobs: {
        success: boolean;
        message: string;
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        hasNext: boolean;
        hasPrevious: boolean;
        jobs: Job[];
      };
    }

    return this.query<Response>({
      query: FETCH_USER_JOBS,
      variables: { statuses, jobTypes, ids, page, pageSize, orderBy, direction },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.getUserJobs.success) {
          throw new Error(data.getUserJobs.message);
        }
        return data.getUserJobs;
      }),
    );
  }

  retryJobs(ids: string[] = []) {
    const GQL = gql`
      mutation RetryJobs($ids: [UUID]!) {
        retryJobs(ids: $ids) {
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
      retryJobs: {
        success: boolean;
        message: string;
        jobs: Job[];
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { ids },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.retryJobs.success) {
          throw new Error(data.retryJobs.message);
        }
        return data.retryJobs;
      }),
    );
  }

  deleteJobs(ids: string[] = []) {
    const GQL = gql`
      mutation DeleteJobs($ids: [UUID]!) {
        deleteJobs(ids: $ids) {
          success
          message
        }
      }
    `;

    interface Response {
      deleteJobs: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { ids },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.deleteJobs.success) {
          throw new Error(data.deleteJobs.message);
        }
        return data.deleteJobs;
      }),
    );
  }
}
