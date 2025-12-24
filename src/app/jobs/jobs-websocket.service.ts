// Copyright (c) 2025 Perpetuator LLC
import { Injectable, OnDestroy, signal, WritableSignal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, Subscription, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../auth/auth.service';
import { Job } from './job.service';

export type JobWebSocketMessageType =
  | 'jobs.initial'
  | 'jobs.created'
  | 'jobs.update'
  | 'jobs.completed'
  | 'jobs.failed'
  | 'pong';

export interface JobWebSocketMessage {
  type: JobWebSocketMessageType;
  job?: Job;
  jobs?: Job[];
  timestamp?: string;
}

export interface JobsRequestFilters {
  status?: string;
  kind?: string;
  limit?: number;
}

export type WebSocketConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

@Injectable({
  providedIn: 'root',
})
export class JobsWebSocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private subscriptions = new Subscription();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: Subscription | null = null;
  private pingInterval: Subscription | null = null;

  // Signals for reactive state
  private connectionStateSignal: WritableSignal<WebSocketConnectionState> = signal('disconnected');
  private jobsSignal: WritableSignal<Job[]> = signal([]);

  // Subject for individual job updates (for components that need to react to specific updates)
  private jobUpdate$ = new Subject<{ type: JobWebSocketMessageType; job: Job }>();

  constructor(private authService: AuthService) {
    // Auto-connect/disconnect based on auth state
    this.subscriptions.add(
      toObservable(this.authService.isLoggedIn).subscribe({
        next: (isLoggedIn) => {
          if (isLoggedIn) {
            this.connect();
          } else {
            this.disconnect();
            this.jobsSignal.set([]);
          }
        },
      }),
    );
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.subscriptions.unsubscribe();
    this.jobUpdate$.complete();
  }

  get connectionState(): WritableSignal<WebSocketConnectionState> {
    return this.connectionStateSignal;
  }

  get jobs(): WritableSignal<Job[]> {
    return this.jobsSignal;
  }

  get jobUpdates() {
    return this.jobUpdate$.asObservable();
  }

  connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.connectionStateSignal.set('connecting');

    const wsUrl = this.buildWebSocketUrl();
    console.debug('Attempting WebSocket connection to:', wsUrl.replace(/token=.*$/, 'token=***'));
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.debug('WebSocket connected');
      this.connectionStateSignal.set('connected');
      this.reconnectAttempts = 0;
      this.startPingInterval();
    };

    this.ws.onmessage = (event) => {
      try {
        const data: JobWebSocketMessage = JSON.parse(event.data);
        console.debug('[WS] Received message:', data.type, data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      // Close codes: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent/code
      // 1000 = Normal closure
      // 1001 = Going away
      // 1002 = Protocol error
      // 1003 = Unsupported data
      // 1006 = Abnormal closure (no close frame received - server not responding)
      // 1015 = TLS handshake failure
      const codeDescriptions: Record<number, string> = {
        1000: 'Normal closure',
        1001: 'Going away',
        1002: 'Protocol error',
        1003: 'Unsupported data',
        1006: 'Abnormal closure (server not responding or not running)',
        1015: 'TLS handshake failure',
      };
      const codeDesc = codeDescriptions[event.code] || 'Unknown';
      console.warn(`WebSocket closed: code=${event.code} (${codeDesc}), reason="${event.reason || 'none'}"`);

      if (event.code === 1006) {
        console.error(
          'WebSocket abnormal closure - possible causes:\n' +
            '  1. Backend server is not running\n' +
            '  2. Backend is not running with ASGI (WebSocket support)\n' +
            '  3. Django Channels not configured\n' +
            '  4. Route /ws/jobs/ not defined in backend\n' +
            '  5. Token authentication failed on backend',
        );
      }

      this.stopPingInterval();
      this.connectionStateSignal.set('disconnected');

      // Only attempt reconnect if we were authenticated and it wasn't a clean close
      if (this.authService.isLoggedIn() && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.error('WebSocket URL was:', wsUrl);
    };
  }

  disconnect(): void {
    this.stopReconnectTimer();
    this.stopPingInterval();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionStateSignal.set('disconnected');
  }

  /**
   * Request a fresh list of jobs with optional filters
   */
  requestJobs(filters?: JobsRequestFilters): void {
    this.send({
      action: 'request_jobs',
      filters: filters || {},
    });
  }

  /**
   * Send a ping to keep the connection alive
   */
  ping(): void {
    this.send({ action: 'ping' });
  }

  /**
   * Add a job locally (for optimistic updates when creating jobs via GraphQL mutation)
   */
  addJob(job: Job): void {
    const currentJobs = this.jobsSignal();
    // Avoid duplicates
    if (!currentJobs.find((j) => j.uuid === job.uuid)) {
      this.jobsSignal.set([job, ...currentJobs]);
    }
  }

  /**
   * Add multiple jobs locally
   */
  addJobs(jobs: Job[]): void {
    const currentJobs = this.jobsSignal();
    const existingUuids = new Set(currentJobs.map((j) => j.uuid));
    const newJobs = jobs.filter((j) => !existingUuids.has(j.uuid));
    if (newJobs.length > 0) {
      this.jobsSignal.set([...newJobs, ...currentJobs]);
    }
  }

  private buildWebSocketUrl(): string {
    // Convert HTTP URL to WebSocket URL
    // e.g., http://127.0.0.1:8000 -> ws://127.0.0.1:8000
    // e.g., https://api.example.com -> wss://api.example.com
    const apiUrl = environment.API_URL;
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '');

    // Include OAuth access token for authentication
    const accessToken = this.authService.getToken();
    const tokenParam = accessToken ? `?token=${accessToken}` : '';

    return `${wsProtocol}://${wsHost}/ws/jobs/${tokenParam}`;
  }

  private handleMessage(data: JobWebSocketMessage): void {
    switch (data.type) {
      case 'jobs.initial':
        // Initial job list on connect - filter to relevant jobs only
        if (data.jobs) {
          console.debug('[WS] Initial jobs received:', data.jobs.length, 'jobs');
          // Log first job structure for debugging
          if (data.jobs.length > 0) {
            console.debug('[WS] Sample job structure:', JSON.stringify(data.jobs[0], null, 2));
          }
          const filteredJobs = this.filterInitialJobs(data.jobs);
          console.debug('[WS] Filtered to:', filteredJobs.length, 'jobs');
          this.jobsSignal.set(filteredJobs);
        }
        break;

      case 'jobs.created':
        if (data.job) {
          console.debug('[WS] Job created:', data.job.uuid, data.job.kind, data.job.status);
          console.debug('[WS] Job created args:', data.job.args);
          console.debug('[WS] Job created result:', data.job.result);
          this.handleJobCreated(data.job);
          this.jobUpdate$.next({ type: data.type, job: data.job });
        }
        break;

      case 'jobs.update':
        if (data.job) {
          console.debug('[WS] Job update:', data.job.uuid, data.job.kind, data.job.status);
          console.debug('[WS] Job args:', data.job.args);
          console.debug('[WS] Job result:', data.job.result);
          this.handleJobUpdate(data.job);
          this.jobUpdate$.next({ type: data.type, job: data.job });
        }
        break;

      case 'jobs.completed':
        if (data.job) {
          console.debug('[WS] Job completed:', data.job.uuid, data.job.kind);
          console.debug('[WS] Job completed args:', data.job.args);
          console.debug('[WS] Job completed result:', data.job.result);
          this.handleJobUpdate(data.job);
          this.jobUpdate$.next({ type: data.type, job: data.job });
        }
        break;

      case 'jobs.failed':
        if (data.job) {
          console.debug('[WS] Job failed:', data.job.uuid, data.job.kind, data.job.error);
          this.handleJobUpdate(data.job);
          this.jobUpdate$.next({ type: data.type, job: data.job });
        }
        break;

      case 'pong':
        // Keep-alive response, nothing to do
        break;

      default:
        console.warn('Unknown WebSocket message type:', data.type);
    }
  }

  private handleJobCreated(job: Job): void {
    const currentJobs = this.jobsSignal();
    // Add to front of list if not already present
    if (!currentJobs.find((j) => j.uuid === job.uuid)) {
      this.jobsSignal.set([job, ...currentJobs]);
    }
  }

  private handleJobUpdate(job: Job): void {
    const currentJobs = this.jobsSignal();
    const index = currentJobs.findIndex((j) => j.uuid === job.uuid);

    if (index >= 0) {
      // Update existing job
      const updatedJobs = [...currentJobs];
      updatedJobs[index] = job;
      this.jobsSignal.set(updatedJobs);
    } else {
      // Job not in list, add it
      this.jobsSignal.set([job, ...currentJobs]);
    }
  }

  /**
   * Filter initial jobs to only include relevant ones:
   * - All PENDING jobs
   * - All RUNNING jobs
   * - COMPLETED/FAILED jobs from the last 30 seconds
   */
  private filterInitialJobs(jobs: Job[]): Job[] {
    const now = new Date();
    const recentThreshold = 30 * 1000; // 30 seconds

    return jobs.filter((job) => {
      const status = job.status.toUpperCase();

      // Always include PENDING and RUNNING
      if (status === 'PENDING' || status === 'RUNNING') {
        return true;
      }

      // For COMPLETED and FAILED, only include if recent (within 30s)
      if (status === 'COMPLETED' || status === 'FAILED') {
        const updatedAt = new Date(job.updatedAt);
        return now.getTime() - updatedAt.getTime() <= recentThreshold;
      }

      return false;
    });
  }

  private send(data: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max WebSocket reconnect attempts reached');
      return;
    }

    this.connectionStateSignal.set('reconnecting');
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, ... up to 30s
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.debug(`Attempting WebSocket reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.stopReconnectTimer();
    this.reconnectTimer = timer(delay).subscribe(() => {
      this.connect();
    });
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      this.reconnectTimer.unsubscribe();
      this.reconnectTimer = null;
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 30 seconds to keep connection alive
    this.pingInterval = timer(30000, 30000).subscribe(() => {
      this.ping();
    });
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      this.pingInterval.unsubscribe();
      this.pingInterval = null;
    }
  }
}
