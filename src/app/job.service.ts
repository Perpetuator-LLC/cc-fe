import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { Apollo } from 'apollo-angular';

// create an enum of jobTypes
export enum JobType {
  FETCH_NEWS = 'fetch_news',
  EXTRACT_NEWS = 'extract_news',
  SUMMARIZE_NEWS = 'summarize_news',
  CREATE_ARTICLE = 'create_article',
  UPDATE_ARTICLE_AUDIO = 'update_article_audio',
}

// create a function to convert string to jobType
export const stringToJobType = (jobType: string) => {
  switch (jobType) {
    case 'fetch_news':
      return JobType.FETCH_NEWS;
    case 'extract_news':
      return JobType.EXTRACT_NEWS;
    case 'summarize_news':
      return JobType.SUMMARIZE_NEWS;
    case 'create_article':
      return JobType.CREATE_ARTICLE;
    case 'update_article_audio':
      return JobType.UPDATE_ARTICLE_AUDIO;
    default:
      throw new Error('Invalid job type');
  }
};

export const jobTypeToString = (jobType: string) => {
  switch (jobType) {
    case JobType.FETCH_NEWS:
      return 'Fetch News';
    case JobType.EXTRACT_NEWS:
      return 'Extract News';
    case JobType.SUMMARIZE_NEWS:
      return 'Summarize News';
    case JobType.CREATE_ARTICLE:
      return 'Create Article';
    case JobType.UPDATE_ARTICLE_AUDIO:
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
        return data.getUserJobs;
      }),
    );
  }

  retryJobs(ids: string[] = []) {
    const GQL = gql`
      mutation RetryJobs($ids: [UUID]!) {
        retryJobs(ids: $ids) {
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
