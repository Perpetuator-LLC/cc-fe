// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { RssFeedResult, PodcastsResult } from './podcasts-list/podcasts-list.component';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { ErrorHandlerService } from './error-handler.service';

@Injectable({
  providedIn: 'root',
})
export class PodcastsService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  createPodcast(name: string): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation CreatePodcast($name: String!) {
        createPodcast(name: $name) {
          success
          message
          podcast {
            id
            name
            team {
              members {
                role
                user {
                  id
                  username
                }
              }
            }
          }
        }
      }
    `;

    interface Response {
      createPodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { name },
    }).pipe(
      map((data) => {
        if (!data.createPodcast.success) {
          throw new Error(data.createPodcast.message);
        }
        return data.createPodcast;
      }),
    );
  }

  refreshTgResponse(id: string): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcast($id: ID!, $refreshTgResponse: Boolean) {
        updatePodcast(podcastId: $id, refreshTgResponse: $refreshTgResponse) {
          success
          message
          podcast {
            id
            name
            enabled
            slug
            url
            intro
            prompt
            outro
            tgChannelId
            tgResponse
            team {
              members {
                user {
                  id
                  username
                }
                role
              }
            }
          }
        }
      }
    `;

    interface Response {
      updatePodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    const refreshTgResponse = true;
    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        id,
        refreshTgResponse,
      },
    }).pipe(
      map((data) => {
        if (!data.updatePodcast.success) {
          throw new Error(data.updatePodcast.message);
        }
        return data.updatePodcast;
      }),
    );
  }

  updatePodcast(
    id: string,
    name: string | null = null,
    intro: string | null = null,
    prompt: string | null = null,
    outro: string | null = null,
    enabled: boolean | null = null,
    slug: string | null = null,
    description: string | null = null,
    ownerName: string | null = null,
    ownerEmail: string | null = null,
    ownerLink: string | null = null,
    tgBotToken: string | null = null,
    tgChannelId: string | null = null,
    refreshTgResponse: boolean | null = null,
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcast(
        $id: ID!
        $name: String!
        $intro: String
        $prompt: String
        $outro: String
        $enabled: Boolean
        $slug: String
        $description: String
        $ownerName: String
        $ownerEmail: String
        $ownerLink: String
        $tgBotToken: String
        $tgChannelId: String
        $refreshTgResponse: Boolean
      ) {
        updatePodcast(
          podcastId: $id
          name: $name
          intro: $intro
          prompt: $prompt
          outro: $outro
          enabled: $enabled
          slug: $slug
          description: $description
          ownerName: $ownerName
          ownerEmail: $ownerEmail
          ownerLink: $ownerLink
          tgBotToken: $tgBotToken
          tgChannelId: $tgChannelId
          refreshTgResponse: $refreshTgResponse
        ) {
          success
          message
          podcast {
            id
            name
            intro
            prompt
            outro
            enabled
            slug
            url
            description
            ownerName
            ownerEmail
            ownerLink
            tgChannelId
            tgResponse
            team {
              members {
                user {
                  id
                  username
                }
                role
              }
            }
          }
        }
      }
    `;

    interface Response {
      updatePodcast: {
        success: boolean;
        message: string;
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        id,
        name,
        intro,
        prompt,
        outro,
        enabled,
        slug,
        description,
        ownerName,
        ownerEmail,
        ownerLink,
        tgBotToken,
        tgChannelId,
        refreshTgResponse,
      },
    }).pipe(
      map((data) => {
        if (!data.updatePodcast.success) {
          throw new Error(data.updatePodcast.message);
        }
        return data.updatePodcast;
      }),
    );
  }

  getPodcastById(id: string): Observable<PodcastsResult> {
    const GET_TEAM_BY_ID = gql`
      query GetPodcastById($id: ID!) {
        podcasts(podcastId: $id) {
          id
          name
          intro
          prompt
          outro
          enabled
          slug
          url
          imageUrl
          description
          ownerName
          ownerEmail
          ownerLink
          tgChannelId
          tgResponse
          rssFeeds {
            id
            url
          }
          team {
            members {
              user {
                id
                username
              }
              role
            }
          }
        }
      }
    `;

    interface Response {
      podcasts: PodcastsResult[];
    }

    return this.query<Response>({
      query: GET_TEAM_BY_ID,
      variables: { id },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.podcasts || data.podcasts.length !== 1) {
          throw new Error('Podcast data is missing');
        }
        return data.podcasts[0];
      }),
    );
  }

  getPodcasts(): Observable<PodcastsResult[]> {
    const GQL = gql`
      query GetPodcasts {
        podcasts {
          id
          name
          team {
            members {
              user {
                id
                username
              }
              role
            }
          }
        }
      }
    `;

    interface Response {
      podcasts: PodcastsResult[];
    }

    return this.query<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(map((data) => data.podcasts));
  }

  // upsertUserToPodcast(podcastId: string, userId: string, role: string): Observable<PodcastsResult> {
  //   const GQL = gql`
  //     mutation UpsertUserToPodcast($podcastId: ID!, $userId: ID!, $role: String!) {
  //       upsertUserToPodcast(podcastId: $podcastId, userId: $userId, role: $role) {
  //         success
  //         message
  //         podcast {
  //           id
  //           name
  //           members {
  //             user {
  //               id
  //               username
  //             }
  //             role
  //           }
  //         }
  //       }
  //     }
  //   `;
  //
  //   interface Response {
  //     upsertUserToPodcast: {
  //       success: boolean;
  //       message: string;
  //       podcast: PodcastsResult;
  //     };
  //   }
  //
  //   return this.mutate<Response>({
  //     mutation: GQL,
  //     variables: { podcastId, userId, role },
  //   }).pipe(
  //     map((data) => {
  //       if (!data.upsertUserToPodcast.success) {
  //         throw new Error(data.upsertUserToPodcast.message);
  //       }
  //       return data.upsertUserToPodcast.podcast;
  //     }),
  //   );
  // }

  // removeUserFromPodcast(podcastId: string, userId: string): Observable<PodcastsResult> {
  //   const REMOVE_USER_FROM_TEAM = gql`
  //     mutation RemoveUserFromPodcast($podcastId: ID!, $userId: ID!) {
  //       removeUserFromPodcast(podcastId: $podcastId, userId: $userId) {
  //         success
  //         message
  //         podcast {
  //           id
  //           name
  //           members {
  //             user {
  //               id
  //               username
  //             }
  //             role
  //           }
  //         }
  //       }
  //     }
  //   `;
  //
  //   interface RemoveUserFromPodcastData {
  //     removeUserFromPodcast: {
  //       success: boolean;
  //       message: string;
  //       podcast: PodcastsResult;
  //     };
  //   }
  //
  //   return this.mutate<RemoveUserFromPodcastData>({
  //     mutation: REMOVE_USER_FROM_TEAM,
  //     variables: { podcastId, userId },
  //   }).pipe(
  //     map((data) => {
  //       if (!data.removeUserFromPodcast.success) {
  //         throw new Error(data.removeUserFromPodcast.message);
  //       }
  //       return data.removeUserFromPodcast.podcast;
  //     }),
  //   );
  // }

  // users(query: string): Observable<User[]> {
  //   const GQL = gql`
  //     query GetUsers($query: String!) {
  //       users(query: $query) {
  //         results {
  //           id
  //           username
  //         }
  //       }
  //     }
  //   `;
  //
  //   interface Response {
  //     users: {
  //       success: boolean;
  //       message: string;
  //       results: User[];
  //     };
  //   }
  //
  //   return this.query<Response>({
  //     query: GQL,
  //     variables: { query },
  //   }).pipe(
  //     map((data) => {
  //       if (!data.users.success) {
  //         throw new Error(data.users.message);
  //       }
  //       return data.users.results;
  //     }),
  //   );
  // }

  deletePodcast(podcastId: string, confirm: string) {
    const DELETE_TEAM = gql`
      mutation DeletePodcast($podcastId: ID!, $confirm: String!) {
        deletePodcast(podcastId: $podcastId, confirm: $confirm) {
          success
          message
        }
      }
    `;

    interface Response {
      deletePodcast: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_TEAM,
      variables: { podcastId, confirm },
    }).pipe(
      map((data) => {
        if (!data.deletePodcast.success) {
          throw new Error(data.deletePodcast.message);
        }
        return data.deletePodcast;
      }),
    );
  }

  // deleteUserResults() {
  //   const GQL = gql`
  //     query GetDeleteUserResults {
  //       deleteUserResults {
  //         deletingPodcasts {
  //           id
  //           name
  //         }
  //         leavingPodcasts {
  //           id
  //           name
  //         }
  //       }
  //     }
  //   `;
  //
  //   interface Response {
  //     deleteUserResults: {
  //       deletingPodcasts: PodcastsResult[];
  //       leavingPodcasts: PodcastsResult[];
  //     };
  //   }
  //
  //   return this.query<Response>({
  //     query: GQL,
  //     fetchPolicy: 'network-only',
  //   }).pipe(
  //     map((data) => {
  //       return data.deleteUserResults;
  //     }),
  //   );
  // }

  // getUserDataExport(exportConfirmation: string) {
  //   const USER_DATA_EXPORT = gql`
  //     query UserDataExport($confirm: String!) {
  //       userDataExport(confirm: $confirm) {
  //         id
  //         username
  //         email
  //         settings {
  //           key
  //           value
  //         }
  //         podcasts {
  //           id
  //           name
  //           intro
  //           prompt
  //           outro
  //           enabled
  //           slug
  //           url
  //           tgResponse
  //           tgChannelId
  //         }
  //         episodes {
  //           title
  //           content
  //           date
  //           telegramDate
  //           podcastDate
  //           podcast {
  //             id
  //             name
  //           }
  //         }
  //         jobs {
  //           id
  //           status
  //           result
  //           args
  //           createdAt
  //           updatedAt
  //         }
  //       }
  //     }
  //   `;
  //
  //   interface Response {
  //     userDataExport: {
  //       id: string;
  //       username: string;
  //       email: string;
  //       settings: { key: string; value: string }[];
  //       podcasts: PodcastsResult[];
  //       episodes: Episode[];
  //       jobs: Job[];
  //     };
  //   }
  //
  //   return this.query<Response>({
  //     query: USER_DATA_EXPORT,
  //     variables: { confirm: exportConfirmation },
  //     fetchPolicy: 'network-only',
  //   }).pipe(
  //     map((data) => {
  //       return data.userDataExport;
  //     }),
  //   );
  // }

  uploadPodcastImage(
    id: string,
    image: File,
  ): Observable<{ success: boolean; message: string; podcast: PodcastsResult }> {
    const GQL = gql`
      mutation UpdatePodcastPodcastImage($id: ID!, $image: Upload!) {
        updatePodcast(podcastId: $id, image: $image) {
          success
          message
          podcast {
            id
            name
            imageUrl
          }
        }
      }
    `;

    return this.apollo
      .mutate({
        mutation: GQL,
        variables: {
          id,
          image,
        },
        context: {
          useMultipart: true,
        },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (!result.data.updatePodcast.success) {
            throw new Error(result.data.updatePodcast.message);
          }
          return result.data.updatePodcast;
        }),
      );
  }

  setPodcastRssFeeds(podcastId: string, rssFeedIds: string[]) {
    const GQL = gql`
      mutation SetPodcastRssFeeds($podcastId: ID!, $rssFeedIds: [ID!]!) {
        updatePodcastRssFeeds(podcastId: $podcastId, rssFeedIds: $rssFeedIds) {
          podcast {
            id
            rssFeeds {
              id
              url
            }
          }
        }
      }
    `;

    interface Response {
      setPodcastRssFeeds: {
        podcast: PodcastsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        podcastId,
        rssFeedIds,
      },
    }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        return result.setPodcastRssFeeds;
      }),
    );
  }

  createRssFeed(url: string) {
    const GQL = gql`
      mutation CreateRssFeed($url: String!) {
        createRssFeed(url: $url) {
          rssFeed {
            id
            url
          }
        }
      }
    `;

    interface Response {
      createRssFeed: {
        rssFeed: RssFeedResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        url,
      },
    }).pipe(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map((result: any) => {
        return result.createRssFeed;
      }),
    );
  }
}
