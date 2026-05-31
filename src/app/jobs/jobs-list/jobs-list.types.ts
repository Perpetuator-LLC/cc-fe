// Copyright (c) 2025-2026 Perpetuator LLC
import { Job } from '../job.service';

export interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
  topicName?: string;
  pulseConfigName?: string;
}

export interface ChainResources {
  podcasts: { uuid: string; name: string }[];
  episodes: { uuid: string; name: string }[];
  topics: { uuid: string; name: string }[];
  pulseConfigs: { uuid: string; name: string }[];
  symbols: { symbol: string; job: EnrichedJob }[];
}

export interface JobChainGroup {
  chainId: string | null;
  jobs: EnrichedJob[];
  expanded: boolean;
  totalCost: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  status: string;
  firstJobKind: string;
  lastJobKind: string;
  createdAt: string;
  updatedAt: string;
  resources: ChainResources;
}
