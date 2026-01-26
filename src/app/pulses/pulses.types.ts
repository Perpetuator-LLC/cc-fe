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
export type PulseStatus = 'pending' | 'generating' | 'ready' | 'delivered' | 'failed';

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
  searchTerm?: string | null;
  watchlistUuid?: string | null;
  symbol?: string | null;

  priority: number; // Higher = more important (0-100)
  isActive: boolean;
  customInstructions?: string | null; // Source-specific instructions for AI
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
  targetWords: number; // Computed: targetDurationMinutes * 150
  maxWords?: number | null;

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

  // Triggering
  isScheduled: boolean; // true = scheduled, false = alert triggered
  configName: string;

  // Delivery
  deliveredAt?: string | null;
  deliveryMethod: DeliveryMethod;

  // Analytics
  playCount: number;
  listenDurationSeconds: number;

  // Timestamps
  createdAt: string;
  generatedAt?: string | null;
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
