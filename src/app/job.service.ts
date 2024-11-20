import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { BaseService } from './base.service';
import { Apollo } from 'apollo-angular';

// create an enum of jobTypes
export enum JobType {
  FETCH_CRYPTO_NEWS = 'fetch_crypto_news',
}

// // convert string to enum
// export const stringToJobType = (jobType: string) => {
//   switch (jobType) {
//     case 'fetch_crypto_news':
//       return JobType.FETCH_CRYPTO_NEWS;
//     default:
//       return null;
//   }
// };
//
// convert the enum to a human-readable string
export const jobTypeToString = (jobType: string) => {
  switch (jobType) {
    case JobType.FETCH_CRYPTO_NEWS:
      return 'Fetch Crypto News';
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

  getUserJobs(statuses: string[] = [], jobTypes: string[] = [], ids: string[] = [], page = 1, pageSize = 10) {
    const FETCH_USER_JOBS = gql`
      query GetUserJobs($statuses: [String!]!, $jobTypes: [String!], $ids: [UUID!], $page: Int!, $pageSize: Int!) {
        getUserJobs(statuses: $statuses, jobTypes: $jobTypes, ids: $ids, page: $page, pageSize: $pageSize) {
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

    interface GetUserJobsResponse {
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

    return this.apollo
      .query<GetUserJobsResponse>({
        query: FETCH_USER_JOBS,
        variables: { statuses, jobTypes, ids, page, pageSize },
        fetchPolicy: 'network-only',
      })
      .pipe(
        map((result) => {
          if (!result.data.getUserJobs.success) {
            throw new Error(result.data.getUserJobs.message);
          }
          return result.data.getUserJobs;
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }

  retryJobs(ids: string[] = []) {
    const RETRY_JOBS = gql`
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

    interface RetryJobsResponse {
      retryJobs: {
        success: boolean;
        message: string;
        jobs: Job[];
      };
    }

    return this.mutate<RetryJobsResponse>({
      mutation: RETRY_JOBS,
      variables: { ids },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.retryJobs.success) {
          throw new Error(data.retryJobs.message);
        }
        return data.retryJobs.jobs;
      }),
    );
  }
}
