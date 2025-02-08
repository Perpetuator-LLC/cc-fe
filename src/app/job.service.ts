import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import gql from 'graphql-tag';
import { map, Subscription } from 'rxjs';
import { BaseService } from './base.service';
import { Apollo } from 'apollo-angular';
import { handleApolloError, mapQueryResult } from './utils/error-handler';
import { catchError } from 'rxjs/operators';

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
      return 'N/A';
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
export class JobService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private jobsSignal: WritableSignal<Job[]> = signal([]);

  constructor(protected override apollo: Apollo) {
    super(apollo);
    this.setupJobStatusPolling();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  get jobs(): WritableSignal<Job[]> {
    return this.jobsSignal;
  }

  private setupJobStatusPolling() {
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
        jobs: Job[];
      };
    }

    const queryRef = this.watchQuery<Response>({
      query: FETCH_USER_JOBS,
      variables: {
        statuses: ['pending', 'running'],
        jobTypes: [
          JobType.SUMMARIZE_NEWS,
          JobType.FETCH_NEWS,
          JobType.EXTRACT_NEWS,
          JobType.CREATE_ARTICLE,
          JobType.UPDATE_ARTICLE_AUDIO,
        ],
        ids: [],
        page: 1,
        pageSize: 100,
        orderBy: 'createdAt',
        direction: 'DESC',
      },
      pollInterval: 3000, // Poll every 3 seconds
    });

    this.subscriptions.add(
      queryRef.valueChanges
        .pipe(
          map(mapQueryResult),
          map((data) => data.getUserJobs.jobs),
          catchError(handleApolloError),
        )
        .subscribe({
          next: (queriedJobs) => {
            const filteredJobs = queriedJobs.filter((job) => {
              // Remove completed and failed jobs from the list
              if (job.status.toUpperCase() === JobStatus.COMPLETED) {
                const updatedAt = new Date(job.updatedAt);
                const now = new Date();
                const xSecondsAgo = new Date(now.getTime() - 5 * 1000);
                return updatedAt > xSecondsAgo; // Keep completed job for X seconds * 1000 ms
              } else if (job.status.toUpperCase() === JobStatus.FAILED) {
                const updatedAt = new Date(job.updatedAt);
                const now = new Date();
                const xSecondsAgo = new Date(now.getTime() - 15 * 1000);
                return updatedAt > xSecondsAgo; // Keep completed job for X seconds * 1000 ms
              }
              return true;
            });
            this.jobsSignal.set(filteredJobs);
          },
          error: (err) => {
            console.error('Failed to fetch jobs:', err);
          },
        }),
    );

    toObservable(this.jobsSignal).subscribe((jobs) => {
      const jobIds = jobs.map((job) => job.id);
      console.log('Monitoring jobs:', jobIds);
      queryRef.setVariables({ ...queryRef.variables, ids: jobIds });
      queryRef.setOptions({ ...queryRef.options, pollInterval: jobs.length === 0 ? 21000 : 3000 });
    });
  }

  addJobs(jobs: Job[]) {
    this.jobsSignal.set([...jobs, ...this.jobsSignal()]);
  }

  addJob(job: Job) {
    this.jobsSignal.set([job, ...this.jobsSignal()]);
  }

  getJobTransitions(newJobs: Job[], previousJobs: Job[], status: string) {
    const transitionedJobs: Job[] = [];
    newJobs.forEach((job: Job) => {
      const existingJob = previousJobs.find((j) => j.id === job.id);
      const jobStatusChanged = existingJob !== undefined && existingJob.status !== job.status;
      if (!jobStatusChanged) {
        return;
      }
      if (job.status.toUpperCase() === status.toUpperCase()) {
        transitionedJobs.push(job);
      }
    });
    return transitionedJobs;
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
            cost
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
