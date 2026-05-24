// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, Subscription, timer } from 'rxjs';
import { AppConfigService } from '../core/app-config.service';
import { AuthService } from '../auth/auth.service';
import { Job } from './job.service';

/**
 * JobsWebSocketService
 *
 * Connects to /ws/graphql/ and handles custom job message types from the backend:
 * - jobs.initial: Initial list of active jobs on connection
 * - jobs.created: New job was created
 * - jobs.update: Job status changed
 * - jobs.completed: Job finished successfully
 * - jobs.failed: Job failed with error
 */

@Injectable({
  providedIn: 'root',
})
export class JobsWebSocketService implements OnDestroy {
  private authService = inject(AuthService);
  private appConfig = inject(AppConfigService);

  private ws: WebSocket | null = null;
  private subscriptions = new Subscription();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: Subscription | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  // Public signals
  readonly jobs: WritableSignal<Job[]> = signal([]);
  readonly isConnected: WritableSignal<boolean> = signal(false);
  readonly connectionError: WritableSignal<string | null> = signal(null);

  // Observable versions for components that prefer observables
  readonly jobs$ = toObservable(this.jobs);
  readonly isConnected$ = toObservable(this.isConnected);
  readonly connectionError$ = toObservable(this.connectionError);

  // Subject for job-specific events
  private readonly jobUpdatedSubject = new Subject<Job>();
  readonly jobUpdated$ = this.jobUpdatedSubject.asObservable();

  private readonly jobCompletedSubject = new Subject<Job>();
  readonly jobCompleted$ = this.jobCompletedSubject.asObservable();

  private readonly jobFailedSubject = new Subject<Job>();
  readonly jobFailed$ = this.jobFailedSubject.asObservable();

  ngOnDestroy(): void {
    this.disconnect();
    this.subscriptions.unsubscribe();
  }

  /**
   * Connect to the GraphQL WebSocket for job updates
   * Uses native WebSocket to handle custom job message types
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.warn('[JobsWS] No access token available');
      return;
    }

    const apiUrl = this.appConfig.config.API_URL;
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const host = apiUrl.replace(/^https?:\/\//, '');
    const url = `${wsProtocol}://${host}/ws/graphql/`;

    console.log('[JobsWS] Connecting to GraphQL WebSocket...', { url });

    try {
      // Use graphql-transport-ws subprotocol
      this.ws = new WebSocket(url, 'graphql-transport-ws');

      this.ws.onopen = () => {
        console.log('[JobsWS] WebSocket opened, sending connection_init');
        // Send connection_init with auth token as per graphql-transport-ws protocol
        this.ws?.send(
          JSON.stringify({
            type: 'connection_init',
            payload: {
              authorization: `Bearer ${token}`,
            },
          }),
        );
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.error('[JobsWS] WebSocket error:', error);
        this.connectionError.set('WebSocket connection error');
        this.isConnected.set(false);
      };

      this.ws.onclose = (event) => {
        console.log('[JobsWS] WebSocket closed:', event.code, event.reason);
        this.isConnected.set(false);
        this.stopPing();

        // Auto-reconnect if authenticated and not a clean close
        if (this.authService.isLoggedIn() && event.code !== 1000) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error('[JobsWS] Failed to create WebSocket:', error);
      this.connectionError.set('Failed to connect');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'connection_ack':
          console.log('[JobsWS] Connection acknowledged');
          this.isConnected.set(true);
          this.connectionError.set(null);
          this.reconnectAttempts = 0;
          this.startPing();
          break;

        case 'jobs.initial':
          console.log(`[JobsWS] Received initial jobs: ${message.jobs?.length || 0}`);
          if (message.jobs && Array.isArray(message.jobs)) {
            // Filter to only pending/running jobs (jobs that need monitoring)
            const activeJobs = message.jobs.filter((job: Job) =>
              ['PENDING', 'RUNNING', 'QUEUED', 'pending', 'running', 'queued'].includes(job.status),
            );
            this.jobs.set(activeJobs);
          }
          break;

        case 'jobs.created':
          console.log(`[JobsWS] Job created: ${message.job?.uuid}`);
          if (message.job) {
            this.addOrUpdateJob(message.job);
            this.jobUpdatedSubject.next(message.job);
          }
          break;

        case 'jobs.update':
          console.log(`[JobsWS] Job updated: ${message.job?.uuid} -> ${message.job?.status}`);
          if (message.job) {
            this.addOrUpdateJob(message.job);
            this.jobUpdatedSubject.next(message.job);
          }
          break;

        case 'jobs.completed':
          console.log(`[JobsWS] Job completed: ${message.job?.uuid}`);
          if (message.job) {
            this.addOrUpdateJob(message.job);
            this.jobCompletedSubject.next(message.job);
            // Keep completed jobs visible for 5 seconds before removing
            timer(5000).subscribe(() => this.removeJob(message.job.uuid));
          }
          break;

        case 'jobs.failed':
          console.log(`[JobsWS] Job failed: ${message.job?.uuid}`);
          if (message.job) {
            this.addOrUpdateJob(message.job);
            this.jobFailedSubject.next(message.job);
            // Keep failed jobs visible for 15 seconds before removing
            timer(15000).subscribe(() => this.removeJob(message.job.uuid));
          }
          break;

        case 'ping':
          // Respond to server ping with pong
          this.ws?.send(JSON.stringify({ type: 'pong' }));
          break;

        case 'pong':
          // Server responded to our ping
          break;

        case 'next':
        case 'complete':
        case 'error':
          // GraphQL subscription messages - ignore as we're using custom job messages
          break;

        default:
          // Log unknown message types for debugging
          if (message.type && !message.type.startsWith('ka')) {
            console.debug('[JobsWS] Unknown message type:', message.type);
          }
      }
    } catch (error) {
      console.error('[JobsWS] Failed to parse message:', error);
    }
  }

  /**
   * Start sending periodic pings to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[JobsWS] Max reconnection attempts reached');
      this.connectionError.set('Failed to reconnect');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`[JobsWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = timer(delay).subscribe(() => {
      this.connect();
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    this.stopPing();

    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Send complete message before closing
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      this.ws = null;
    }

    this.isConnected.set(false);
    this.jobs.set([]);
  }

  /**
   * Add or update a job in the jobs list
   * Only updates if the incoming job has a newer updatedAt timestamp to prevent
   * stale mutation responses from overwriting fresh WebSocket updates.
   */
  private addOrUpdateJob(job: Job): void {
    this.jobs.update((jobs) => {
      const index = jobs.findIndex((j) => j.uuid === job.uuid);
      if (index >= 0) {
        const existing = jobs[index];
        // Compare timestamps to prevent stale data from overwriting fresh updates
        const existingTime = new Date(existing.updatedAt).getTime();
        const incomingTime = new Date(job.updatedAt).getTime();

        if (incomingTime < existingTime) {
          // Incoming job is older than what we have - skip update
          console.log(
            `[JobsWS] Skipping stale update for job ${job.uuid?.slice(0, 8)}: ` +
              `incoming ${job.status} is older than existing ${existing.status}`,
          );
          return jobs;
        }

        console.log(`[JobsWS] Updating job ${job.uuid?.slice(0, 8)}: ${existing.status} -> ${job.status}`);
        const updated = [...jobs];
        updated[index] = job;
        return updated;
      } else {
        const total = jobs.length + 1;
        console.log(`[JobsWS] Adding new job ${job.uuid?.slice(0, 8)} status=${job.status} (total: ${total})`);
        return [job, ...jobs];
      }
    });
  }

  /**
   * Remove a job from the list
   */
  private removeJob(uuid: string): void {
    this.jobs.update((jobs) => jobs.filter((j) => j.uuid !== uuid));
  }

  /**
   * Get a specific job by UUID
   */
  getJob(uuid: string): Job | undefined {
    return this.jobs().find((j) => j.uuid === uuid);
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: string): Job[] {
    return this.jobs().filter((j) => j.status === status);
  }

  /**
   * Add a single job to the list (called by other services when creating jobs)
   * Also emits to jobUpdated$ so components like JobsListComponent can react
   */
  addJob(job: Job): void {
    this.addOrUpdateJob(job);
    this.jobUpdatedSubject.next(job);
  }

  /**
   * Add multiple jobs to the list
   */
  addJobs(jobs: Job[]): void {
    jobs.forEach((job) => this.addOrUpdateJob(job));
  }

  // ============================================================================
  // Handlers for forwarded messages from TerminalWebSocketService
  // These methods are called when TerminalWebSocketService receives job messages
  // ============================================================================

  /**
   * Handle initial jobs list from WebSocket
   */
  handleInitialJobs(jobs: Job[]): void {
    console.log(`[JobsWS] Received initial jobs via forwarding: ${jobs?.length || 0}`);
    if (jobs && Array.isArray(jobs)) {
      // Filter to only pending/running jobs (jobs that need monitoring)
      const activeJobs = jobs.filter((job: Job) =>
        ['PENDING', 'RUNNING', 'QUEUED', 'pending', 'running', 'queued'].includes(job.status),
      );
      console.log(`[JobsWS] After filtering to active jobs: ${activeJobs.length} jobs`);
      if (activeJobs.length > 0) {
        console.log(
          `[JobsWS] Active job statuses: ${activeJobs.map((j) => `${j.uuid?.slice(0, 8)}:${j.status}`).join(', ')}`,
        );
      }
      this.jobs.set(activeJobs);
      this.isConnected.set(true);
      this.connectionError.set(null);
    }
  }

  /**
   * Handle job completed event from WebSocket
   */
  handleJobCompleted(job: Job): void {
    console.log(`[JobsWS] Job completed via forwarding: ${job?.uuid}`);
    if (job) {
      this.addOrUpdateJob(job);
      this.jobCompletedSubject.next(job);
      // Keep completed jobs visible for 5 seconds before removing
      // This matches JobService.cleanupOldJobs timing
      timer(5000).subscribe(() => this.removeJob(job.uuid));
    }
  }

  /**
   * Handle job failed event from WebSocket
   */
  handleJobFailed(job: Job): void {
    console.log(`[JobsWS] Job failed via forwarding: ${job?.uuid}`);
    if (job) {
      this.addOrUpdateJob(job);
      this.jobFailedSubject.next(job);
      // Keep failed jobs visible for 15 seconds before removing
      // This matches JobService.cleanupOldJobs timing
      timer(15000).subscribe(() => this.removeJob(job.uuid));
    }
  }
}
