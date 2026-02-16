// Copyright (c) 2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import { gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../base.service';
import { PageInfo } from '../utils/relay';
import {
  PulseConfig,
  Pulse,
  ContentSource,
  AlertTrigger,
  ContentSourceInput,
  AlertTriggerInput,
  DeliveryMethod,
  ScheduleFrequency,
  RssFeed,
  SearchOptimization,
} from './pulses.types';

// Fragment for pulse config fields
const PULSE_CONFIG_FRAGMENT = gql`
  fragment PulseConfigFields on PulseConfigType {
    uuid
    name
    description
    isActive
    targetDurationMinutes
    maxDurationMinutes
    targetWords
    maxWords
    wordsPerMinute
    tone
    customInstructions
    includeIntro
    includeOutro
    introText
    outroText
    deliveryMethod
    scheduleFrequency
    scheduleTime
    scheduleTimezone
    scheduleDays
    newsLookbackHours
    createdAt
    updatedAt
    lastGeneratedAt
    voice {
      uuid
      displayName
      model
      sampleUrl
      wordsPerMinute
    }
    contentSources {
      uuid
      sourceType
      sourceDetail
      rssUrl
      rssFeedUuid
      searchTerm
      watchlistUuid
      symbol
      priority
      isActive
      customInstructions
    }
    alertTriggers {
      uuid
      alertType
      keywords
      symbol
      priceThreshold
      priceDirection
      percentChange
      daysBefore
      isActive
      cooldownMinutes
      lastTriggeredAt
    }
  }
`;

// Fragment for pulse fields
const PULSE_FRAGMENT = gql`
  fragment PulseFields on PulseType {
    uuid
    title
    transcript
    summary
    originalText
    wasConverted
    audioUrl
    audioDurationSeconds
    wordCount
    status
    errorMessage
    validatedCompliance
    validatedFacts
    validatedLength
    isValidated
    validationNotes
    agentActions
    news {
      id
      uuid
      title
      summary
      url
      source
      publishedAt
      blocked
      rssFeeds {
        id
        name
        url
        isReachable
        isParsable
      }
    }
    researchUrls
    isScheduled
    configName
    deliveredAt
    deliveryMethod
    playCount
    listenDurationSeconds
    createdAt
    generatedAt
  }
`;

export interface PulseConfigsResponse {
  pulseConfigs: PulseConfig[];
  pageInfo: PageInfo;
  totalCount: number;
}

export interface PulsesResponse {
  pulses: Pulse[];
  pageInfo: PageInfo;
  totalCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class PulsesService extends BaseService {
  // ==================== QUERIES ====================

  /**
   * Get all user's pulse configurations
   */
  getPulseConfigs(
    first = 20,
    after?: string | null,
    search?: string,
    isActive?: boolean,
    orderBy?: string,
  ): Observable<PulseConfigsResponse> {
    const GQL = gql`
      ${PULSE_CONFIG_FRAGMENT}
      query GetPulseConfigs($first: Int, $after: String, $search: String, $isActive: Boolean, $orderBy: String) {
        pulseConfigs(first: $first, after: $after, search: $search, isActive: $isActive, orderBy: $orderBy) {
          edges {
            node {
              ...PulseConfigFields
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `;

    interface Response {
      pulseConfigs: {
        edges: { node: PulseConfig }[];
        pageInfo: PageInfo;
        totalCount: number;
      };
    }

    return this.query<Response>({
      query: GQL,
      variables: { first, after, search, isActive, orderBy },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => ({
        pulseConfigs: data.pulseConfigs.edges.map((e) => e.node),
        pageInfo: data.pulseConfigs.pageInfo,
        totalCount: data.pulseConfigs.totalCount,
      })),
    );
  }

  /**
   * Get a single pulse configuration by UUID
   */
  getPulseConfig(uuid: string): Observable<PulseConfig> {
    const GQL = gql`
      ${PULSE_CONFIG_FRAGMENT}
      query GetPulseConfig($uuid: UUID!) {
        pulseConfig(uuid: $uuid) {
          ...PulseConfigFields
        }
      }
    `;

    interface Response {
      pulseConfig: PulseConfig;
    }

    return this.query<Response>({
      query: GQL,
      variables: { uuid },
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.pulseConfig));
  }

  /**
   * Get generated pulses (recordings) with optional filters
   * NOTE: search parameter requires backend support - see fe106_request_pulses_search.md
   */
  getPulses(
    configUuid?: string,
    status?: string,
    search?: string,
    first = 20,
    after?: string | null,
  ): Observable<PulsesResponse> {
    const GQL = gql`
      ${PULSE_FRAGMENT}
      query GetPulses($configUuid: UUID, $status: String, $search: String, $first: Int, $after: String) {
        pulses(configUuid: $configUuid, status: $status, search: $search, first: $first, after: $after) {
          edges {
            node {
              ...PulseFields
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
          totalCount
        }
      }
    `;

    interface Response {
      pulses: {
        edges: { node: Pulse }[];
        pageInfo: PageInfo;
        totalCount: number;
      };
    }

    return this.query<Response>({
      query: GQL,
      variables: { configUuid, status, search, first, after },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => ({
        pulses: data.pulses.edges.map((e) => e.node),
        pageInfo: data.pulses.pageInfo,
        totalCount: data.pulses.totalCount,
      })),
    );
  }

  /**
   * Get a single pulse by UUID
   */
  getPulse(uuid: string): Observable<Pulse> {
    const GQL = gql`
      ${PULSE_FRAGMENT}
      query GetPulse($uuid: UUID!) {
        pulse(uuid: $uuid) {
          ...PulseFields
        }
      }
    `;

    interface Response {
      pulse: Pulse;
    }

    return this.query<Response>({
      query: GQL,
      variables: { uuid },
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.pulse));
  }

  // ==================== MUTATIONS ====================

  /**
   * Create a new pulse configuration
   */
  createPulseConfig(input: {
    name: string;
    description?: string;
    targetDurationMinutes?: number;
    maxDurationMinutes?: number;
    tone?: string;
    deliveryMethod?: DeliveryMethod;
    scheduleFrequency?: ScheduleFrequency;
    scheduleTime?: string;
    scheduleTimezone?: string;
    newsLookbackHours?: number;
    voiceUuid?: string;
    contentSources?: ContentSourceInput[];
    alertTriggers?: AlertTriggerInput[];
  }): Observable<{ success: boolean; message: string; pulseConfig: PulseConfig }> {
    const GQL = gql`
      ${PULSE_CONFIG_FRAGMENT}
      mutation CreatePulseConfig(
        $name: String!
        $description: String
        $targetDurationMinutes: Float
        $maxDurationMinutes: Float
        $tone: String
        $deliveryMethod: String
        $scheduleFrequency: String
        $scheduleTime: String
        $scheduleTimezone: String
        $newsLookbackHours: Int
        $voiceUuid: UUID
        $contentSources: [ContentSourceInput!]
        $alertTriggers: [AlertTriggerInput!]
      ) {
        createPulseConfig(
          name: $name
          description: $description
          targetDurationMinutes: $targetDurationMinutes
          maxDurationMinutes: $maxDurationMinutes
          tone: $tone
          deliveryMethod: $deliveryMethod
          scheduleFrequency: $scheduleFrequency
          scheduleTime: $scheduleTime
          scheduleTimezone: $scheduleTimezone
          newsLookbackHours: $newsLookbackHours
          voiceUuid: $voiceUuid
          contentSources: $contentSources
          alertTriggers: $alertTriggers
        ) {
          success
          message
          pulseConfig {
            ...PulseConfigFields
          }
        }
      }
    `;

    interface Response {
      createPulseConfig: {
        success: boolean;
        message: string;
        pulseConfig: PulseConfig;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: input,
    }).pipe(
      map((data) => {
        if (!data.createPulseConfig.success) {
          throw new Error(data.createPulseConfig.message);
        }
        return data.createPulseConfig;
      }),
    );
  }

  /**
   * Update an existing pulse configuration
   */
  updatePulseConfig(
    pulseConfigUuid: string,
    updates: Partial<{
      name: string;
      description: string;
      isActive: boolean;
      targetDurationMinutes: number;
      maxDurationMinutes: number;
      tone: string;
      customInstructions: string;
      includeIntro: boolean;
      includeOutro: boolean;
      introText: string;
      outroText: string;
      deliveryMethod: DeliveryMethod;
      scheduleFrequency: ScheduleFrequency;
      scheduleTime: string;
      scheduleTimezone: string;
      newsLookbackHours: number;
      voiceUuid: string;
    }>,
  ): Observable<{ success: boolean; message: string; pulseConfig: PulseConfig }> {
    const GQL = gql`
      ${PULSE_CONFIG_FRAGMENT}
      mutation UpdatePulseConfig(
        $pulseConfigUuid: UUID!
        $name: String
        $description: String
        $isActive: Boolean
        $targetDurationMinutes: Float
        $maxDurationMinutes: Float
        $tone: String
        $customInstructions: String
        $includeIntro: Boolean
        $includeOutro: Boolean
        $introText: String
        $outroText: String
        $deliveryMethod: String
        $scheduleFrequency: String
        $scheduleTime: String
        $scheduleTimezone: String
        $newsLookbackHours: Int
        $voiceUuid: UUID
      ) {
        updatePulseConfig(
          pulseConfigUuid: $pulseConfigUuid
          name: $name
          description: $description
          isActive: $isActive
          targetDurationMinutes: $targetDurationMinutes
          maxDurationMinutes: $maxDurationMinutes
          tone: $tone
          customInstructions: $customInstructions
          includeIntro: $includeIntro
          includeOutro: $includeOutro
          introText: $introText
          outroText: $outroText
          deliveryMethod: $deliveryMethod
          scheduleFrequency: $scheduleFrequency
          scheduleTime: $scheduleTime
          scheduleTimezone: $scheduleTimezone
          newsLookbackHours: $newsLookbackHours
          voiceUuid: $voiceUuid
        ) {
          success
          message
          pulseConfig {
            ...PulseConfigFields
          }
        }
      }
    `;

    interface Response {
      updatePulseConfig: {
        success: boolean;
        message: string;
        pulseConfig: PulseConfig;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseConfigUuid, ...updates },
    }).pipe(
      map((data) => {
        if (!data.updatePulseConfig.success) {
          throw new Error(data.updatePulseConfig.message);
        }
        return data.updatePulseConfig;
      }),
    );
  }

  /**
   * Delete a pulse configuration
   */
  deletePulseConfig(pulseConfigUuid: string): Observable<{ success: boolean; message: string }> {
    const GQL = gql`
      mutation DeletePulseConfig($pulseConfigUuid: UUID!) {
        deletePulseConfig(pulseConfigUuid: $pulseConfigUuid) {
          success
          message
        }
      }
    `;

    interface Response {
      deletePulseConfig: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseConfigUuid },
    }).pipe(
      map((data) => {
        if (!data.deletePulseConfig.success) {
          throw new Error(data.deletePulseConfig.message);
        }
        return data.deletePulseConfig;
      }),
    );
  }

  // ==================== CONTENT SOURCES ====================

  /**
   * Add a content source to a pulse configuration
   */
  addContentSource(
    pulseConfigUuid: string,
    source: ContentSourceInput,
    autoOptimize = true,
  ): Observable<{
    success: boolean;
    message: string;
    contentSource: ContentSource;
    searchOptimization?: SearchOptimization;
  }> {
    const GQL = gql`
      mutation AddContentSource($pulseConfigUuid: UUID!, $source: ContentSourceInput!, $autoOptimize: Boolean) {
        addContentSource(pulseConfigUuid: $pulseConfigUuid, source: $source, autoOptimize: $autoOptimize) {
          success
          message
          contentSource {
            uuid
            sourceType
            sourceDetail
            rssUrl
            rssFeedUuid
            searchTerm
            searchTermOriginal
            searchUserIntent
            searchExtractionFocus
            searchIsProduct
            searchIsNews
            searchIsResearch
            watchlistUuid
            symbol
            priority
            isActive
            customInstructions
          }
          searchOptimization {
            originalQuery
            optimizedQuery
            userIntent
            extractionFocus
            isProductSearch
            isNewsSearch
            isResearchSearch
            suggestedVariations
            customInstructions
          }
        }
      }
    `;

    interface Response {
      addContentSource: {
        success: boolean;
        message: string;
        contentSource: ContentSource;
        searchOptimization?: SearchOptimization;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseConfigUuid, source, autoOptimize },
    }).pipe(
      map((data) => {
        if (!data.addContentSource.success) {
          throw new Error(data.addContentSource.message);
        }
        return data.addContentSource;
      }),
    );
  }

  /**
   * Update a content source
   */
  updateContentSource(
    contentSourceUuid: string,
    updates: {
      searchTermOriginal?: string;
      reOptimize?: boolean;
      priority?: number;
      isActive?: boolean;
      customInstructions?: string;
    },
  ): Observable<{
    success: boolean;
    message: string;
    contentSource: ContentSource;
    searchOptimization?: SearchOptimization;
  }> {
    const GQL = gql`
      mutation UpdateContentSource(
        $contentSourceUuid: UUID!
        $searchTermOriginal: String
        $reOptimize: Boolean
        $priority: Int
        $isActive: Boolean
        $customInstructions: String
      ) {
        updateContentSource(
          contentSourceUuid: $contentSourceUuid
          searchTermOriginal: $searchTermOriginal
          reOptimize: $reOptimize
          priority: $priority
          isActive: $isActive
          customInstructions: $customInstructions
        ) {
          success
          message
          contentSource {
            uuid
            sourceType
            sourceDetail
            rssUrl
            rssFeedUuid
            searchTerm
            searchTermOriginal
            searchUserIntent
            searchExtractionFocus
            searchIsProduct
            searchIsNews
            searchIsResearch
            watchlistUuid
            symbol
            priority
            isActive
            customInstructions
          }
          searchOptimization {
            originalQuery
            optimizedQuery
            userIntent
            extractionFocus
            isProductSearch
            isNewsSearch
            isResearchSearch
            suggestedVariations
            customInstructions
          }
        }
      }
    `;

    interface Response {
      updateContentSource: {
        success: boolean;
        message: string;
        contentSource: ContentSource;
        searchOptimization?: SearchOptimization;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { contentSourceUuid, ...updates },
    }).pipe(
      map((data) => {
        if (!data.updateContentSource.success) {
          throw new Error(data.updateContentSource.message);
        }
        return data.updateContentSource;
      }),
    );
  }

  /**
   * Remove a content source
   */
  removeContentSource(contentSourceUuid: string): Observable<{ success: boolean; message: string }> {
    const GQL = gql`
      mutation RemoveContentSource($contentSourceUuid: UUID!) {
        removeContentSource(contentSourceUuid: $contentSourceUuid) {
          success
          message
        }
      }
    `;

    interface Response {
      removeContentSource: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { contentSourceUuid },
    }).pipe(
      map((data) => {
        if (!data.removeContentSource.success) {
          throw new Error(data.removeContentSource.message);
        }
        return data.removeContentSource;
      }),
    );
  }

  // ==================== ALERT TRIGGERS ====================

  /**
   * Add an alert trigger to a pulse configuration
   */
  addAlertTrigger(
    pulseConfigUuid: string,
    trigger: AlertTriggerInput,
  ): Observable<{ success: boolean; message: string; alertTrigger: AlertTrigger }> {
    const GQL = gql`
      mutation AddAlertTrigger($pulseConfigUuid: UUID!, $trigger: AlertTriggerInput!) {
        addAlertTrigger(pulseConfigUuid: $pulseConfigUuid, trigger: $trigger) {
          success
          message
          alertTrigger {
            uuid
            alertType
            keywords
            symbol
            priceThreshold
            priceDirection
            percentChange
            daysBefore
            isActive
            cooldownMinutes
            lastTriggeredAt
          }
        }
      }
    `;

    interface Response {
      addAlertTrigger: {
        success: boolean;
        message: string;
        alertTrigger: AlertTrigger;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseConfigUuid, trigger },
    }).pipe(
      map((data) => {
        if (!data.addAlertTrigger.success) {
          throw new Error(data.addAlertTrigger.message);
        }
        return data.addAlertTrigger;
      }),
    );
  }

  /**
   * Remove an alert trigger
   */
  removeAlertTrigger(alertTriggerUuid: string): Observable<{ success: boolean; message: string }> {
    const GQL = gql`
      mutation RemoveAlertTrigger($alertTriggerUuid: UUID!) {
        removeAlertTrigger(alertTriggerUuid: $alertTriggerUuid) {
          success
          message
        }
      }
    `;

    interface Response {
      removeAlertTrigger: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { alertTriggerUuid },
    }).pipe(
      map((data) => {
        if (!data.removeAlertTrigger.success) {
          throw new Error(data.removeAlertTrigger.message);
        }
        return data.removeAlertTrigger;
      }),
    );
  }

  // ==================== GENERATION & DELIVERY ====================

  /**
   * Generate a pulse immediately (async job)
   * Returns jobUuid (first job) and jobUuids (all jobs in chain)
   */
  generatePulse(
    pulseConfigUuid: string,
  ): Observable<{ success: boolean; message: string; jobUuid: string; jobUuids: string[] }> {
    const GQL = gql`
      mutation GeneratePulse($pulseConfigUuid: UUID!) {
        generatePulse(pulseConfigUuid: $pulseConfigUuid) {
          success
          message
          jobUuid
          jobUuids
        }
      }
    `;

    interface Response {
      generatePulse: {
        success: boolean;
        message: string;
        jobUuid: string;
        jobUuids: string[];
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseConfigUuid },
    }).pipe(
      map((data) => {
        if (!data.generatePulse.success) {
          throw new Error(data.generatePulse.message);
        }
        return data.generatePulse;
      }),
    );
  }

  /**
   * Generate audio from custom text (Text-to-Speech)
   * Creates a "blank" pulse with just the provided text
   *
   * @param text The text to convert to speech (max 50,000 characters)
   * @param title Optional title for the generated audio
   * @param voiceUuid Optional voice UUID (uses default if not provided)
   */
  generateTextToSpeech(
    text: string,
    title?: string,
    voiceUuid?: string,
  ): Observable<{
    success: boolean;
    message: string;
    pulse: Pulse;
    jobUuid: string;
  }> {
    const GQL = gql`
      ${PULSE_FRAGMENT}
      mutation GenerateTextToSpeech($text: String!, $title: String, $voiceUuid: UUID) {
        generateTextToSpeech(text: $text, title: $title, voiceUuid: $voiceUuid) {
          success
          message
          pulse {
            ...PulseFields
          }
          jobUuid
        }
      }
    `;

    interface Response {
      generateTextToSpeech: {
        success: boolean;
        message: string;
        pulse: Pulse;
        jobUuid: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { text, title, voiceUuid },
    }).pipe(
      map((data) => {
        if (!data.generateTextToSpeech.success) {
          throw new Error(data.generateTextToSpeech.message);
        }
        return data.generateTextToSpeech;
      }),
    );
  }

  /**
   * Create a recording from custom text within a specific Pulse.
   * This uses the Pulse's configured voice and can optionally convert
   * the text to an audio-friendly transcript.
   *
   * @param pulseConfigUuid The Pulse to create the recording under
   * @param title Title for the recording
   * @param text The text content to convert to speech
   * @param convertToTranscript If true (default), AI converts text to clean transcript
   */
  createRecording(
    pulseConfigUuid: string,
    title: string,
    text: string,
    convertToTranscript = true,
  ): Observable<{
    success: boolean;
    message: string;
    pulse: Pulse;
    jobUuid: string;
  }> {
    const GQL = gql`
      ${PULSE_FRAGMENT}
      mutation CreateRecording(
        $pulseConfigUuid: UUID!
        $title: String!
        $text: String!
        $convertToTranscript: Boolean
      ) {
        createRecording(
          pulseConfigUuid: $pulseConfigUuid
          title: $title
          text: $text
          convertToTranscript: $convertToTranscript
        ) {
          success
          message
          pulse {
            ...PulseFields
          }
          jobUuid
        }
      }
    `;

    interface Response {
      createRecording: {
        success: boolean;
        message: string;
        pulse: Pulse;
        jobUuid: string;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseConfigUuid, title, text, convertToTranscript },
    }).pipe(
      map((data) => {
        if (!data.createRecording.success) {
          throw new Error(data.createRecording.message);
        }
        return data.createRecording;
      }),
    );
  }

  /**
   * Deliver a ready pulse
   */
  deliverPulse(
    pulseUuid: string,
    deliveryMethod?: DeliveryMethod,
  ): Observable<{
    success: boolean;
    message: string;
    delivery: { uuid: string; sentAt: string; wasSuccessful: boolean };
  }> {
    const GQL = gql`
      mutation DeliverPulse($pulseUuid: UUID!, $deliveryMethod: String) {
        deliverPulse(pulseUuid: $pulseUuid, deliveryMethod: $deliveryMethod) {
          success
          message
          delivery {
            uuid
            sentAt
            wasSuccessful
          }
        }
      }
    `;

    interface Response {
      deliverPulse: {
        success: boolean;
        message: string;
        delivery: {
          uuid: string;
          sentAt: string;
          wasSuccessful: boolean;
        };
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { pulseUuid, deliveryMethod },
    }).pipe(
      map((data) => {
        if (!data.deliverPulse.success) {
          throw new Error(data.deliverPulse.message);
        }
        return data.deliverPulse;
      }),
    );
  }

  /**
   * Search RSS feeds by name or URL for autocomplete
   * Returns matching feeds from existing database using backend search
   */
  searchRssFeeds(query: string, limit = 20): Observable<RssFeed[]> {
    // Use backend searchRssFeeds query for server-side search
    const GQL = gql`
      query SearchRssFeeds($query: String!, $limit: Int, $onlyValid: Boolean) {
        searchRssFeeds(query: $query, limit: $limit, onlyValid: $onlyValid) {
          uuid
          url
          name
          isReachable
          isParsable
          articlesPerDay
        }
      }
    `;

    interface Response {
      searchRssFeeds: RssFeed[];
    }

    // Use server-side search with multi-word AND logic
    return this.query<Response>({
      query: GQL,
      variables: {
        query: query || '',
        limit,
        onlyValid: true,
      },
      fetchPolicy: 'network-only', // Always get fresh results for search
    }).pipe(map((data) => data.searchRssFeeds || []));
  }

  /**
   * Get all RSS feeds (cached, for initial list)
   */
  getAllRssFeeds(onlyValid = true): Observable<RssFeed[]> {
    const GQL = gql`
      query RssFeedsList($onlyValid: Boolean) {
        rssFeedsList(onlyValid: $onlyValid) {
          uuid
          url
          name
          isReachable
          isParsable
          articlesPerDay
        }
      }
    `;

    interface Response {
      rssFeedsList: RssFeed[];
    }

    return this.query<Response>({
      query: GQL,
      variables: { onlyValid },
      fetchPolicy: 'cache-first', // Cache for performance
    }).pipe(map((data) => data.rssFeedsList || []));
  }
}
