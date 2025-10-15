// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';
import { Job } from './job.service';
import { RelayConnection } from './utils/relay';

export interface Source {
  uuid: string;
  title: string | null;
  url: string;
  content: string | null;
  createdAt: string;
}

export interface Topic {
  uuid: string;
  title: string;
  description: string | null;
  researchContent: string | null;
  validatedContent: string | null;
  transcript: string | null;
  createdAt: string;
  updatedAt: string;
  podcast: {
    uuid: string;
    name: string;
  };
  sources: Source[];
}

interface CreateResearchChainResponse {
  createResearchChain: {
    success: boolean;
    message: string;
    jobs: Job[];
  };
}

interface GetTopicsResponse {
  topics: RelayConnection<Topic>;
}

@Injectable({
  providedIn: 'root',
})
export class ResearchService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  getTopics(podcastUuid?: string, first = 10, after: string | null = null): Observable<{ topics: Topic[] }> {
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
}
