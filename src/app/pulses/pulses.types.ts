// Copyright (c) 2026 Perpetuator LLC
import { Voice } from '../podcast/voices.service';

/**
 * RSS Feed from backend for autocomplete
 */
export interface RssFeed {
  uuid: string;
  url: string;
  name: string | null;
  isReachable: boolean;
  isParsable: boolean;
  articlesPerDay: number;
}

/**
 * Content source types for pulse configuration
 */
export type ContentSourceType = 'rss_feed' | 'search_term' | 'watchlist' | 'company';

/**
 * Alert trigger types (breaking_news currently implemented, others future)
 */
export type AlertType =
  | 'breaking_news'
  | 'price_alert'
  | 'earnings'
  | 'sec_filing'
  | 'indicator_alert'
  | 'fundamental_alert';

/**
 * Pulse status during generation and delivery
 */
export type PulseStatus = 'PENDING' | 'GENERATING' | 'READY' | 'DELIVERED' | 'FAILED';

/**
 * Delivery method for pulses
 */
export type DeliveryMethod = 'sms_link' | 'email_link' | 'push_notification' | 'in_app';

/**
 * Schedule frequency options
 */
export type ScheduleFrequency = 'once' | 'daily' | 'weekdays' | 'weekly' | 'custom';

/**
 * Content source - defines where to get news for a pulse
 */
export interface ContentSource {
  uuid: string;
  sourceType: ContentSourceType;
  sourceDetail: string; // Human-readable description

  // Type-specific fields
  rssUrl?: string | null;
  rssFeedUuid?: string | null;
  rssFeedUrl?: string | null; // Actual URL of the RSS feed
  rssFeedName?: string | null; // Name of the RSS feed
  searchTerm?: string | null; // Optimized search query
  watchlistUuid?: string | null;
  symbol?: string | null;

  // Search optimization fields (for search_term sources)
  searchTermOriginal?: string | null; // Original raw term user entered
  searchUserIntent?: string | null; // AI-inferred intent
  searchExtractionFocus?: string[] | null; // Things to extract from results
  searchIsProduct?: boolean | null; // Product/purchase search
  searchIsNews?: boolean | null; // News/current events search
  searchIsResearch?: boolean | null; // Deep research search

  priority: number; // Higher = more important (0-100)
  isActive: boolean;
  customInstructions?: string | null; // Source-specific instructions for AI
}

/**
 * Search optimization result from AI
 */
export interface SearchOptimization {
  originalQuery: string;
  optimizedQuery: string;
  userIntent: string;
  extractionFocus: string[];
  isProductSearch: boolean;
  isNewsSearch: boolean;
  isResearchSearch: boolean;
  suggestedVariations: string[];
  customInstructions: string;
}

/**
 * Alert trigger - causes immediate pulse generation when conditions are met
 */
export interface AlertTrigger {
  uuid: string;
  alertType: AlertType;

  // For breaking_news
  keywords?: string[] | null;

  // For price_alert (future)
  symbol?: string | null;
  priceThreshold?: number | null;
  priceDirection?: 'above' | 'below' | 'any' | null;
  percentChange?: number | null;

  // For earnings/SEC (future)
  daysBefore?: number | null;

  isActive: boolean;
  cooldownMinutes: number; // Min time between alerts (default 30)
  lastTriggeredAt?: string | null;
}

/**
 * Pulse configuration - user's personal settings for what content they want
 */
export interface PulseConfig {
  uuid: string;
  name: string;
  description: string;
  isActive: boolean;

  // Duration
  targetDurationMinutes: number;
  maxDurationMinutes?: number | null;
  targetWords: number; // Computed by BE: targetDurationMinutes * wordsPerMinute
  maxWords?: number | null;
  wordsPerMinute: number; // Voice-specific WPM or default 150

  // Customization
  tone: string; // "professional", "casual", "formal", "conversational"
  customInstructions?: string | null; // User preferences like "Focus on tech stocks"
  includeIntro: boolean;
  includeOutro: boolean;
  introText?: string | null; // Custom intro text when includeIntro is true
  outroText?: string | null; // Custom outro text when includeOutro is true

  // Voice (same Voice model as podcasts)
  voice?: Voice | null;

  // Delivery
  deliveryMethod: DeliveryMethod;
  smsNotificationEnabled: boolean; // SMS notification when pulse is ready
  emailNotificationEnabled: boolean; // Email notification when pulse is ready

  // Schedule
  scheduleFrequency: ScheduleFrequency;
  scheduleTime?: string | null; // "HH:MM" format
  scheduleTimezone: string;
  scheduleDays?: number[] | null; // [0,1,2,3,4] for Mon-Fri
  newsLookbackHours: number;

  // Nested
  contentSources: ContentSource[];
  alertTriggers: AlertTrigger[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastGeneratedAt?: string | null;
}

/**
 * Generated pulse - the audio file with transcript
 */
export interface Pulse {
  uuid: string;
  title: string;
  transcript: string;
  summary: string;

  // Original text (for user-created recordings)
  originalText?: string | null;
  wasConverted?: boolean;

  // Audio
  audioUrl: string;
  audioDurationSeconds: number;
  wordCount: number;

  // Status
  status: PulseStatus;
  errorMessage?: string | null;

  // Validation (same as episodes)
  validatedCompliance: boolean;
  validatedFacts: boolean;
  validatedLength: boolean;
  isValidated: boolean; // Computed: all three true
  validationNotes?: string | null;

  // Agent actions (research steps taken during pulse generation)
  agentActions?: string | null; // JSON string of AgentAction[]

  // News articles used in this pulse
  news?: PulseNewsItem[] | null;

  // Research URLs accessed during validation/fact-checking
  researchUrls?: string[] | null;

  // Triggering
  isScheduled: boolean; // true = scheduled, false = alert triggered
  configName: string;
  configUuid?: string | null; // UUID of parent PulseConfig (null for standalone)

  // Delivery
  deliveredAt?: string | null;
  deliveryMethod: DeliveryMethod;

  // Analytics
  playCount: number;
  listenDurationSeconds: number;

  // Timestamps
  createdAt: string;
  generatedAt?: string | null;
  generatingStartedAt?: string | null; // When generation started (for stale detection)
}

/**
 * Agent action record from pulse generation
 */
export interface AgentAction {
  tool: string;
  args: Record<string, unknown>;
  status: 'success' | 'no_results' | 'error';
  result_count?: number;
  result_summary?: string;
  items?: AgentActionItem[];
  error?: string;
}

export interface AgentActionItem {
  title?: string;
  url?: string;
  source?: string;
  publishedAt?: string;
}

/**
 * News item referenced in a pulse
 */
export interface PulseNewsItem {
  id: string;
  title: string;
  url: string;
  source?: string;
  publishedAt: string;
  blocked?: boolean;
  rssFeeds?: PulseRssFeed[];
}

export interface PulseRssFeed {
  id: string;
  name?: string;
  url: string;
  isReachable: boolean;
  isParsable: boolean;
}

/**
 * Input for creating/updating content sources
 */
export interface ContentSourceInput {
  sourceType: ContentSourceType;
  rssUrl?: string | null;
  rssFeedUuid?: string | null;
  searchTerm?: string | null;
  watchlistUuid?: string | null;
  symbol?: string | null;
  priority?: number;
  customInstructions?: string | null;
}

/**
 * Input for creating/updating alert triggers
 */
export interface AlertTriggerInput {
  alertType: AlertType;
  keywords?: string[] | null;
  symbol?: string | null;
  priceThreshold?: number | null;
  priceDirection?: 'above' | 'below' | 'any' | null;
  percentChange?: number | null;
  daysBefore?: number | null;
  cooldownMinutes?: number;
}
