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
// convert the enum to a human readable string
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
  constructor(apollo: Apollo) {
    super(apollo);
  }

  getUserJobs(statuses: string[] = [], jobTypes: string[] = [], ids: string[] = []) {
    const FETCH_USER_JOBS = gql`
      query GetUserJobs($statuses: [String!]!, $jobTypes: [String!], $ids: [UUID!]) {
        getUserJobs(statuses: $statuses, jobTypes: $jobTypes, ids: $ids) {
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

    interface GetUserJobsResponse {
      getUserJobs: {
        success: boolean;
        message: string;
        jobs: Job[];
      };
    }

    return this.apollo
      .query<GetUserJobsResponse>({
        query: FETCH_USER_JOBS,
        variables: { statuses, jobTypes, ids },
        fetchPolicy: 'network-only',
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data.getUserJobs.success) {
            throw new Error(result.data.getUserJobs.message);
          }
          return result.data.getUserJobs.jobs;
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

    return this.mutate<RetryJobsResponse>(RETRY_JOBS, { ids }).pipe(
      map((data) => {
        if (!data.retryJobs.success) {
          throw new Error(data.retryJobs.message);
        }
        return data.retryJobs.jobs;
        // if (result.errors) {
        //   throw new Error(result.errors.map((e) => e.message).join(', '));
        // } else if (!result.data.retryJobs.success) {
        //   throw new Error(result.data.retryJobs.message);
        // }
        // return result.data.retryJobs.jobs;
      }),
      // catchError((error) => {
      //   console.error('GraphQL query error:', error);
      //   if (error.cause?.error?.errors) {
      //     return throwError(() => {
      //       const errors = error.cause.error.errors.map((e: { message: string }) => e.message).join(', ');
      //       console.error('GraphQL query errors:', errors);
      //       return new Error(errors);
      //       // new Error(error.cause.error.errors.map((e: { message: string }) => e.message).join(', '));
      //     });
      //   }
      //   return throwError(() => new Error(`GraphQL Mutation Error: ${error.message}`));
      //   // console.error('GraphQL query error:', error);
      //   // return throwError(() => new Error(error.message));
      // }),
    );
  }

  fetchCryptoNewsData() {
    const FETCH_CRYPTO_NEWS_DATA = gql`
      mutation {
        fetchCryptoNewsData {
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

    interface FetchCryptoNewsDataResponse {
      fetchCryptoNewsData: {
        success: boolean;
        message: string;
        job: Job;
      };
    }

    return this.apollo
      .mutate<FetchCryptoNewsDataResponse>({
        mutation: FETCH_CRYPTO_NEWS_DATA,
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (result.errors) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            throw new Error(result.errors.map((e: any) => e.message).join(', '));
          } else if (!result.data?.fetchCryptoNewsData.success) {
            throw new Error(result.data?.fetchCryptoNewsData.message);
          }
          return result.data?.fetchCryptoNewsData.job;
        }),
        catchError((error) => {
          console.error('GraphQL query error:', error);
          return throwError(() => new Error(error.message));
        }),
      );
  }
}
