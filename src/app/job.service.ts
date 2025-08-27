// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import gql from 'graphql-tag';
import { map, Subscription } from 'rxjs';
import { BaseService } from './base.service';
import { Apollo, QueryRef } from 'apollo-angular';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ErrorHandlerService } from './error-handler.service';
import { MessageService } from './message.service';
import { RelayConnection } from './utils/relay';

export enum JobKind {
  FETCH_NEWS = 'FETCH_NEWS',
  EXTRACT_NEWS = 'EXTRACT_NEWS',
  SUMMARIZE_NEWS = 'SUMMARIZE_NEWS',
  CREATE_EPISODE = 'CREATE_EPISODE',
  SELECT_UNUSED_NEWS = 'SELECT_UNUSED_NEWS',
  UPDATE_EPISODE_AUDIO = 'UPDATE_EPISODE_AUDIO',
  PUBLISH_EPISODE_AUDIO = 'PUBLISH_EPISODE_AUDIO',
}

export const stringToJobKind = (kind: string) => {
  switch (kind.toUpperCase()) {
    case 'FETCH_NEWS':
      return JobKind.FETCH_NEWS;
    case 'EXTRACT_NEWS':
      return JobKind.EXTRACT_NEWS;
    case 'SUMMARIZE_NEWS':
      return JobKind.SUMMARIZE_NEWS;
    case 'CREATE_EPISODE':
      return JobKind.CREATE_EPISODE;
    case 'SELECT_UNUSED_NEWS':
      return JobKind.SELECT_UNUSED_NEWS;
    case 'UPDATE_EPISODE_AUDIO':
      return JobKind.UPDATE_EPISODE_AUDIO;
    case 'PUBLISH_EPISODE_AUDIO':
      return JobKind.PUBLISH_EPISODE_AUDIO;
    default:
      throw new Error('Invalid job type');
  }
};

export const kindToString = (kind: string) => {
  switch (kind.toUpperCase()) {
    case JobKind.FETCH_NEWS:
      return 'Fetch News';
    case JobKind.EXTRACT_NEWS:
      return 'Extract News';
    case JobKind.SUMMARIZE_NEWS:
      return 'Summarize News';
    case JobKind.CREATE_EPISODE:
      return 'Create Episode';
    case JobKind.SELECT_UNUSED_NEWS:
      return 'Select Unused News';
    case JobKind.UPDATE_EPISODE_AUDIO:
      return 'Update Episode Audio';
    case JobKind.PUBLISH_EPISODE_AUDIO:
      return 'Publish Episode Audio';
    default:
      return 'N/A';
  }
};

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export const stringToJobStatus = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING':
      return JobStatus.PENDING;
    case 'RUNNING':
      return JobStatus.RUNNING;
    case 'COMPLETED':
      return JobStatus.COMPLETED;
    case 'FAILED':
      return JobStatus.FAILED;
    default:
      throw new Error('Invalid job status');
  }
};

export const statusToString = (status: string) => {
  switch (status.toUpperCase()) {
    case JobStatus.PENDING:
      return 'Pending';
    case JobStatus.RUNNING:
      return 'Running';
    case JobStatus.COMPLETED:
      return 'Completed';
    case JobStatus.FAILED:
      return 'Failed';
    default:
      return 'N/A';
  }
};

export interface Job {
  id: string;
  uuid: string;
  kind: string;
  status: string;
  error: string;
  result: string;
  createdAt: string;
  updatedAt: string;
  cost?: number;
}

interface GetUserJobsResponse {
  jobs: RelayConnection<Job>;
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
      if (stringToJobStatus(job.status) === JobStatus.COMPLETED) {
        return now.getTime() - updatedAt.getTime() <= 5000; // Keep completed job for 5 seconds
      } else if (stringToJobStatus(job.status) === JobStatus.FAILED) {
        return now.getTime() - updatedAt.getTime() <= 15000; // Keep failed job for 15 seconds
      }
      return true;
    });
    if (filteredJobs.length !== jobs.length) {
      this.jobsSignal.set(filteredJobs);
    }
  }

  private setupJobStatusPolling() {
    // this.initializeJobStatusPolling();
    this.subscriptions.add(
      toObservable(this.authService.isLoggedIn).subscribe({
        next: (isLoggedIn) => {
          if (this.jobStatusSubscription) {
            // NOTE: If logged out, unsubscribe from the job status subscription, if logged in
            this.jobStatusSubscription.unsubscribe();
          }
          if (isLoggedIn) {
            this.initializeJobStatusPolling();
            return;
          }
        },
        error: (error) => {
          this.messageService.error(`Failed to load jobs after login signal: ${error.message}`);
        },
      }),
    );

    this.subscriptions.add(
      toObservable(this.jobsSignal).subscribe((jobs) => {
        if (!this.queryRef) {
          return; // If queryRef is not initialized, do nothing
        }
        const jobUuids = jobs.map((job) => job.uuid);
        this.queryRef.setVariables({ ...this.queryRef.variables, jobUuids });
        this.queryRef.setOptions({ ...this.queryRef.options, pollInterval: jobs.length === 0 ? 0 : 3000 });
      }),
    );
  }

  private initializeJobStatusPolling() {
    const GET_USER_JOBS = gql`
      query GetUserJobs(
        $statuses: [JobStatus!]!
        $kinds: [JobKind!]
        $jobUuids: [UUID!]
        $first: Int
        $after: String
        $orderBy: String
      ) {
        jobs(statuses: $statuses, kinds: $kinds, jobUuids: $jobUuids, first: $first, after: $after, orderBy: $orderBy) {
          edges {
            cursor
            node {
              id
              uuid
              kind
              status
              error
              result
              createdAt
              updatedAt
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    this.queryRef = this.watchQuery<GetUserJobsResponse>({
      query: GET_USER_JOBS,
      variables: {
        statuses: [JobStatus.PENDING, JobStatus.RUNNING],
        kinds: [
          JobKind.SUMMARIZE_NEWS,
          JobKind.FETCH_NEWS,
          JobKind.EXTRACT_NEWS,
          JobKind.CREATE_EPISODE,
          JobKind.SELECT_UNUSED_NEWS,
          JobKind.UPDATE_EPISODE_AUDIO,
          JobKind.PUBLISH_EPISODE_AUDIO,
        ],
        jobUuids: [],
        // after: ??,
        first: 15, // Most windows are 3 wide, so 5 tall
        orderBy: '-createdAt',
      },
      pollInterval: 3000, // Poll every 3 seconds
    });

    this.jobStatusSubscription = this.queryRef.valueChanges
      .pipe(
        // switchMap(() => this.queryRef.valueChanges), // was this to rebind on error?
        catchError((error) => this.errorHandler.handleError(error)),
      )
      .subscribe({
        next: (results) => this.jobsSignal.set(results.data.jobs.edges.map((edge) => edge.node)),
        error: (error) => {
          this.messageService.error(`Failed to fetch job: ${error.message}`);
        },
      });
    this.subscriptions.add(this.jobStatusSubscription);

    this.queryRef.refetch();
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
      const existingJob = previousJobs.find((j) => j.uuid === job.uuid);
      const jobStatusChanged =
        existingJob !== undefined && stringToJobStatus(existingJob.status) !== stringToJobStatus(job.status);
      if (!jobStatusChanged) {
        return;
      }
      if (stringToJobStatus(job.status) === stringToJobStatus(status)) {
        transitionedJobs.push(job);
      }
    });
    return transitionedJobs;
  }

  getJobs(
    statuses: string[] = [],
    kinds: string[] = [],
    jobUuids: string[] = [],
    first = 10,
    after: string | null = null,
    sort = 'createdAt',
    direction = 'DESC',
  ) {
    const FETCH_USER_JOBS = gql`
      query GetUserJobs(
        $statuses: [JobStatus!]!
        $kinds: [JobKind!]
        $jobUuids: [UUID!]
        $first: Int
        $after: String
        $orderBy: String
      ) {
        jobs(statuses: $statuses, kinds: $kinds, jobUuids: $jobUuids, first: $first, after: $after, orderBy: $orderBy) {
          edges {
            cursor
            node {
              id
              uuid
              kind
              status
              error
              result
              createdAt
              updatedAt
              cost
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const orderBy = direction === 'DESC' ? `-${sort}` : sort;

    interface Response {
      jobs: RelayConnection<Job>;
    }

    return this.query<Response>({
      query: FETCH_USER_JOBS,
      variables: { statuses, kinds, jobUuids, first, after, orderBy },
      fetchPolicy: 'network-only',
    }).pipe(
      map(({ jobs }) => ({
        jobs: jobs.edges.map((edge) => edge.node),
        pageInfo: jobs.pageInfo,
      })),
    );
  }

  retryJobs(jobUuids: string[]) {
    const RETRY_JOBS = gql`
      mutation RetryJobs($jobUuids: [UUID!]!) {
        retryJobs(jobUuids: $jobUuids) {
          success
          message
          jobs {
            id
            uuid
            kind
            status
            error
            result
            createdAt
            updatedAt
            cost
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
      mutation: RETRY_JOBS,
      variables: { jobUuids },
    }).pipe(
      map((data) => {
        if (!data.retryJobs.success) {
          throw new Error(data.retryJobs.message);
        }
        return data.retryJobs;
      }),
    );
  }

  deleteJobs(jobUuids: string[]) {
    const DELETE_JOBS = gql`
      mutation DeleteJobs($jobUuids: [UUID!]!) {
        deleteJobs(jobUuids: $jobUuids) {
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
      mutation: DELETE_JOBS,
      variables: { jobUuids },
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
