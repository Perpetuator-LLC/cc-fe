// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import gql from 'graphql-tag';
import { map, Subscription } from 'rxjs';
import { BaseService } from './base.service';
import { Apollo, QueryRef } from 'apollo-angular';
import { mapQueryResult } from './utils/error-handler';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { MessageService } from './message.service';

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

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
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

interface GetUserJobsResponse {
  getUserJobs: { jobs: Job[] };
}

@Injectable({
  providedIn: 'root',
})
export class JobService extends BaseService implements OnDestroy {
  private subscriptions = new Subscription();
  private jobStatusSubscription: Subscription | undefined;
  private jobsSignal: WritableSignal<Job[]> = signal([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cleanupInterval: any;
  private queryRef!: QueryRef<GetUserJobsResponse>;

  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
    private authService: AuthService,
    private messageService: MessageService,
  ) {
    super(apollo, errorHandler);
    this.setupJobStatusPolling();
    this.setupCleanupLoop();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    clearInterval(this.cleanupInterval);
  }

  get jobs(): WritableSignal<Job[]> {
    return this.jobsSignal;
  }

  private setupCleanupLoop() {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 5000); // Run cleanup every 5 seconds
  }

  private cleanupOldJobs() {
    const now = new Date();
    const jobs = this.jobsSignal();
    const filteredJobs = jobs.filter((job) => {
      const updatedAt = new Date(job.updatedAt);
      if (job.status === JobStatus.COMPLETED) {
        return now.getTime() - updatedAt.getTime() <= 5000; // Keep completed job for 5 seconds
      } else if (job.status === JobStatus.FAILED) {
        return now.getTime() - updatedAt.getTime() <= 15000; // Keep failed job for 15 seconds
      }
      return true;
    });
    if (filteredJobs.length !== jobs.length) {
      this.jobsSignal.set(filteredJobs);
    }
  }

  private setupJobStatusPolling() {
    this.initializeJobStatusPolling();
    this.subscriptions.add(
      toObservable(this.authService.isLoggedIn).subscribe({
        next: (isLoggedIn) => {
          if (isLoggedIn) {
            this.initializeJobStatusPolling();
            return;
          }
          if (this.jobStatusSubscription) {
            this.jobStatusSubscription.unsubscribe();
          }
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs after login signal: ${error.message}`);
        },
      }),
    );

    this.subscriptions.add(
      toObservable(this.jobsSignal).subscribe((jobs) => {
        const jobIds = jobs.map((job) => job.id);
        this.queryRef.setVariables({ ...this.queryRef.variables, ids: jobIds });
        this.queryRef.setOptions({ ...this.queryRef.options, pollInterval: jobs.length === 0 ? 21000 : 3000 });
      }),
    );
  }

  private initializeJobStatusPolling() {
    const GET_USER_JOBS = gql`
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

    this.queryRef = this.watchQuery<GetUserJobsResponse>({
      query: GET_USER_JOBS,
      variables: {
        statuses: [JobStatus.PENDING, JobStatus.RUNNING],
        jobTypes: [
          JobType.SUMMARIZE_NEWS,
          JobType.FETCH_NEWS,
          JobType.EXTRACT_NEWS,
          JobType.CREATE_ARTICLE,
          JobType.UPDATE_ARTICLE_AUDIO,
        ],
        ids: [],
        page: 1,
        pageSize: 15, // Most windows are 3 wide, so 5 tall
        orderBy: 'createdAt',
        direction: 'DESC',
      },
      pollInterval: 3000, // Poll every 3 seconds
    });

    this.jobStatusSubscription = this.queryRef.valueChanges
      .pipe(
        switchMap(() => this.queryRef.valueChanges),
        map(mapQueryResult),
        map((data) => data.getUserJobs.jobs),
        catchError((error) => this.errorHandler.handleError(error)),
      )
      .subscribe({
        next: (jobs) => this.jobsSignal.set(jobs),
        error: (err) => this.messageService.error(`Failed to fetch job: ${err.message}`),
      });
    this.subscriptions.add(this.jobStatusSubscription);
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
      if (job.status === status) {
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
