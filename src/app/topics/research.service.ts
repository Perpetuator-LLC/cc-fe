// Copyright (c) 2025-2026 Perpetuator LLC
import { Injectable } from '@angular/core';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../base.service';
import { Job } from '../jobs/job.service';
import { RelayConnection, PageInfo } from '../utils/relay';

export interface Source {
  uuid: string;
  title: string | null;
  url: string;
  content: string | null;
  createdAt: string;
}

export interface GetTopicsResult {
  topics: Topic[];
  pageInfo: PageInfo;
}

export interface Topic {
  uuid: string;
  title: string;
  description: string | null;
  researchContent: string | null;
  validatedContent: string | null;
  transcript: string | null;
  isUserCreated?: boolean;
  createdAt: string;
  updatedAt: string;
  podcast: {
    uuid: string;
    name: string;
  };
  episode?: {
    uuid: string;
    title: string;
  } | null;
  sources: Source[];
}

interface CreateResearchChainResponse {
  createResearchChain: {
    success: boolean;
    message: string;
    jobs: Job[];
  };
}

interface CreateFullResearchChainResponse {
  createFullResearchChain: {
    success: boolean;
    message: string;
    jobs: Job[];
  };
}

interface PublishResearchTopicEpisodeChainResponse {
  publishResearchTopicEpisodeChain: {
    success: boolean;
    message: string;
    jobs: Job[];
  };
}

interface CreateCustomTopicResponse {
  createCustomTopic: {
    success: boolean;
    message: string;
    topic: Topic;
  };
}

interface UpdateTopicResponse {
  updateTopic: {
    success: boolean;
    message: string;
    topic: Topic;
  };
}

interface GetTopicsResponse {
  topics: RelayConnection<Topic>;
}

@Injectable({
  providedIn: 'root',
})
export class ResearchService extends BaseService {
  getTopics(podcastUuid?: string, first = 10, after: string | null = null): Observable<GetTopicsResult> {
    const GET_TOPICS = gql`
      query GetTopics($podcastUuid: UUID, $first: Int, $after: String) {
        topics(podcastUuid: $podcastUuid, first: $first, after: $after) {
          edges {
            cursor
            node {
              uuid
              title
              description
              researchContent
              validatedContent
              transcript
              createdAt
              updatedAt
              podcast {
                uuid
                name
              }
              episode {
                uuid
                title
              }
              sources {
                uuid
                title
                url
                content
                createdAt
              }
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

    return this.query<GetTopicsResponse>({
      query: GET_TOPICS,
      variables: { podcastUuid, first, after },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => ({
        topics: data.topics.edges.map((edge) => edge.node),
        pageInfo: data.topics.pageInfo,
      })),
    );
  }

  getTopicById(topicUuid: string): Observable<Topic> {
    const GET_TOPIC = gql`
      query GetTopic($topicUuid: UUID!) {
        topics(topicUuid: $topicUuid) {
          edges {
            cursor
            node {
              uuid
              title
              description
              researchContent
              validatedContent
              transcript
              createdAt
              updatedAt
              podcast {
                uuid
                name
              }
              episode {
                uuid
                title
              }
              sources {
                uuid
                title
                url
                content
                createdAt
              }
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

    return this.query<GetTopicsResponse>({
      query: GET_TOPIC,
      variables: { topicUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.topics?.edges || data.topics.edges.length !== 1) {
          throw new Error('Topic not found');
        }
        return data.topics.edges[0].node;
      }),
    );
  }

  createResearchChain(podcastUuid: string): Observable<CreateResearchChainResponse['createResearchChain']> {
    const CREATE_RESEARCH_CHAIN = gql`
      mutation CreateResearchChain($podcastUuid: UUID!) {
        createResearchChain(podcastUuid: $podcastUuid) {
          success
          message
          jobs {
            id
            kind
            status
            args
            error
            result
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<CreateResearchChainResponse>({
      mutation: CREATE_RESEARCH_CHAIN,
      variables: { podcastUuid },
    }).pipe(
      map((data) => {
        if (!data.createResearchChain.success) {
          throw new Error(data.createResearchChain.message);
        }
        return data.createResearchChain;
      }),
    );
  }

  createFullResearchChain(
    podcastUuid: string,
    topicUuid?: string,
  ): Observable<CreateFullResearchChainResponse['createFullResearchChain']> {
    const CREATE_FULL_RESEARCH_CHAIN = gql`
      mutation CreateFullResearchChain($podcastUuid: UUID!, $topicUuid: UUID) {
        createFullResearchChain(podcastUuid: $podcastUuid, topicUuid: $topicUuid) {
          success
          message
          jobs {
            id
            kind
            status
            args
            error
            result
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<CreateFullResearchChainResponse>({
      mutation: CREATE_FULL_RESEARCH_CHAIN,
      variables: { podcastUuid, topicUuid },
    }).pipe(
      map((data) => {
        if (!data.createFullResearchChain.success) {
          throw new Error(data.createFullResearchChain.message);
        }
        return data.createFullResearchChain;
      }),
    );
  }

  publishResearchTopicEpisodeChain(
    podcastUuid: string,
    topicUuid: string,
  ): Observable<PublishResearchTopicEpisodeChainResponse['publishResearchTopicEpisodeChain']> {
    const PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN = gql`
      mutation PublishResearchTopicEpisodeChain($podcastUuid: UUID!, $topicUuid: UUID!) {
        publishResearchTopicEpisodeChain(podcastUuid: $podcastUuid, topicUuid: $topicUuid) {
          success
          message
          jobs {
            id
            kind
            status
            args
            error
            result
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<PublishResearchTopicEpisodeChainResponse>({
      mutation: PUBLISH_RESEARCH_TOPIC_EPISODE_CHAIN,
      variables: { podcastUuid, topicUuid },
    }).pipe(
      map((data) => {
        if (!data.publishResearchTopicEpisodeChain.success) {
          throw new Error(data.publishResearchTopicEpisodeChain.message);
        }
        return data.publishResearchTopicEpisodeChain;
      }),
    );
  }

  createCustomTopic(
    podcastUuid: string,
    title: string,
    description?: string,
  ): Observable<CreateCustomTopicResponse['createCustomTopic']> {
    const CREATE_CUSTOM_TOPIC = gql`
      mutation CreateCustomTopic($podcastUuid: UUID!, $title: String!, $description: String) {
        createCustomTopic(podcastUuid: $podcastUuid, title: $title, description: $description) {
          success
          message
          topic {
            uuid
            title
            description
            isUserCreated
            createdAt
          }
        }
      }
    `;

    return this.mutate<CreateCustomTopicResponse>({
      mutation: CREATE_CUSTOM_TOPIC,
      variables: { podcastUuid, title, description },
    }).pipe(
      map((data) => {
        if (!data.createCustomTopic.success) {
          throw new Error(data.createCustomTopic.message);
        }
        return data.createCustomTopic;
      }),
    );
  }

  updateTopic(
    topicUuid: string,
    updates: {
      title?: string;
      description?: string;
      researchContent?: string;
      validatedContent?: string;
      transcript?: string;
    },
  ): Observable<UpdateTopicResponse['updateTopic']> {
    const UPDATE_TOPIC = gql`
      mutation UpdateTopic(
        $topicUuid: UUID!
        $title: String
        $description: String
        $researchContent: String
        $validatedContent: String
        $transcript: String
      ) {
        updateTopic(
          topicUuid: $topicUuid
          title: $title
          description: $description
          researchContent: $researchContent
          validatedContent: $validatedContent
          transcript: $transcript
        ) {
          success
          message
          topic {
            uuid
            title
            description
            researchContent
            validatedContent
            transcript
            isUserCreated
            createdAt
            updatedAt
          }
        }
      }
    `;

    return this.mutate<UpdateTopicResponse>({
      mutation: UPDATE_TOPIC,
      variables: { topicUuid, ...updates },
    }).pipe(
      map((data) => {
        if (!data.updateTopic.success) {
          throw new Error(data.updateTopic.message);
        }
        return data.updateTopic;
      }),
    );
  }
}
