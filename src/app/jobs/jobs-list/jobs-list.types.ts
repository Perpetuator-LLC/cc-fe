// Copyright (c) 2025-2026 Perpetuator LLC
import { Job } from '../job.service';

/**
 * Pre-computed display state for an EnrichedJob. Built once per job in
 * `enrichJobsWithNames` so the template can read static property accesses
 * instead of calling methods on every change-detection tick.
 */
export interface JobDisplay {
  iconName: string;
  statusClass: string;
  kindLabel: string;
  cleanMessage: string;
  cleanError: string;
  isFailedOrPending: boolean;
  symbolTooltip: string;
  // Resource flags + UUIDs/names (mirrors JobDisplayService getters)
  hasPodcast: boolean;
  podcastUuid: string | null;
  podcastName: string;
  hasEpisode: boolean;
  episodeUuid: string | null;
  episodeName: string;
  hasTopic: boolean;
  topicUuid: string | null;
  topicName: string;
  hasPulseConfig: boolean;
  pulseConfigUuid: string | null;
  pulseConfigName: string;
  hasBlog: boolean;
  blogUuid: string | null;
  blogName: string;
  hasArticle: boolean;
  articleUuid: string | null;
  articleTitle: string;
  hasSymbol: boolean;
  symbol: string | null;
}

export interface EnrichedJob extends Job {
  podcastName?: string;
  episodeName?: string;
  topicName?: string;
  pulseConfigName?: string;
  /** Pre-computed display state. Set during enrichment. */
  display: JobDisplay;
  /** Discriminator for the timeline union (standalone job branch). */
  isChainGroup: false;
}

/** Aggregated resources from all jobs in a chain */
export interface ChainResources {
  podcasts: { uuid: string; name: string }[];
  episodes: { uuid: string; name: string }[];
  topics: { uuid: string; name: string }[];
  pulseConfigs: { uuid: string; name: string }[];
  symbols: { symbol: string; job: EnrichedJob; tooltip: string }[];
}

/** Pre-computed display state for a JobChainGroup. */
export interface ChainDisplay {
  title: string;
  icon: string;
  statusClass: string;
  hasResources: boolean;
}

/** Represents a group of jobs in a chain, or a single standalone job */
export interface JobChainGroup {
  /** Discriminator for the timeline union (chain branch). */
  isChainGroup: true;
  chainId: string | null;
  jobs: EnrichedJob[];
  expanded: boolean;
  // Aggregated stats
  totalCost: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  status: string; // Overall status: completed, running, pending, failed
  firstJobKind: string;
  lastJobKind: string;
  createdAt: string;
  updatedAt: string;
  // Pre-computed resources
  resources: ChainResources;
  /** Pre-computed display state. */
  display: ChainDisplay;
}

/** Discriminated union used for the timeline items array. */
export type TimelineItem = EnrichedJob | JobChainGroup;

export interface StatusOption {
  value: string | null;
  label: string;
}
