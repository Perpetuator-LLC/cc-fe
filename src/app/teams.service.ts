// Copyright (c) 2025 Perpetuator LLC
import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { User } from './types';
import { Episode } from './episode/episode.service';
import { Job } from './job.service';
import { ErrorHandlerService } from './error-handler.service';
import { PodcastsResult } from './podcasts.service';
import { RelayConnection } from './utils/relay';

export interface UserResult {
  id: string;
  uuid: string;
  username: string;
}

export interface MemberResult {
  user: UserResult;
  role: string;
}

export interface RssFeedResult {
  id: string;
  uuid: string;
  url: string;
}

export interface TeamsResult {
  id: string;
  uuid: string;
  name: string | null;
  members: MemberResult[];
  podcasts: PodcastsResult[];
}

const GET_TEAMS = gql`
  query GetMyTeams {
    teams {
      edges {
        node {
          id
          uuid
          name
          members {
            user {
              id
              uuid
              username
            }
            role
          }
          podcasts {
            id
            uuid
            name
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

@Injectable({
  providedIn: 'root',
})
export class TeamsService extends BaseService {
  constructor(
    protected override apollo: Apollo,
    protected override errorHandler: ErrorHandlerService,
  ) {
    super(apollo, errorHandler);
  }

  createTeam(name: string): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const GQL = gql`
      mutation CreateTeam($name: String!) {
        createTeam(name: $name) {
          success
          message
          team {
            id
            uuid
            name
            members {
              role
              user {
                id
                uuid
                username
              }
            }
          }
        }
      }
    `;

    interface Response {
      createTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { name },
    }).pipe(
      map((data) => {
        if (!data.createTeam.success) {
          throw new Error(data.createTeam.message);
        }
        return data.createTeam;
      }),
    );
  }

  updateTeam(
    teamUuid: string,
    name: string | null = null,
  ): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const GQL = gql`
      mutation UpdateTeam($teamUuid: UUID!, $name: String!) {
        updateTeam(teamUuid: $teamUuid, name: $name) {
          success
          message
          team {
            id
            uuid
            name
            members {
              user {
                id
                uuid
                username
              }
              role
            }
          }
        }
      }
    `;

    interface Response {
      updateTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: {
        teamUuid,
        name,
      },
    }).pipe(
      map((data) => {
        if (!data.updateTeam.success) {
          throw new Error(data.updateTeam.message);
        }
        return data.updateTeam;
      }),
    );
  }

  getTeamById(teamUuid: string) {
    const GET_TEAM_BY_ID = gql`
      query GetTeamById($teamUuid: UUID!) {
        teams(teamUuid: $teamUuid) {
          edges {
            node {
              id
              uuid
              name
              members {
                user {
                  id
                  uuid
                  username
                }
                role
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

    interface Response {
      teams: RelayConnection<TeamsResult>;
    }

    return this.query<Response>({
      query: GET_TEAM_BY_ID,
      variables: { teamUuid },
      fetchPolicy: 'network-only',
    }).pipe(
      map((response) => {
        if (!response.teams?.edges || response.teams.edges.length !== 1) {
          throw new Error('Team data is missing');
        }
        return response.teams.edges[0].node;
      }),
    );
  }

  getTeams() {
    interface Response {
      teams: RelayConnection<TeamsResult>;
    }

    return this.query<Response>({
      query: GET_TEAMS,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => ({
        teams: data.teams.edges.map((edge) => edge.node),
        pageInfo: data.teams.pageInfo,
      })),
    );
  }

  upsertUserToTeam(teamUuid: string, userUuid: string, role: string): Observable<TeamsResult> {
    const GQL = gql`
      mutation UpsertUserToTeam($teamUuid: UUID!, $userUuid: UUID!, $role: String!) {
        upsertUserToTeam(teamUuid: $teamUuid, userUuid: $userUuid, role: $role) {
          success
          message
          team {
            id
            uuid
            name
            members {
              user {
                id
                uuid
                username
              }
              role
            }
          }
        }
      }
    `;

    interface Response {
      upsertUserToTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { teamUuid, userUuid, role },
    }).pipe(
      map((data) => {
        if (!data.upsertUserToTeam.success) {
          throw new Error(data.upsertUserToTeam.message);
        }
        return data.upsertUserToTeam.team;
      }),
    );
  }

  removeUserFromTeam(teamUuid: string, userUuid: string): Observable<TeamsResult> {
    const REMOVE_USER_FROM_TEAM = gql`
      mutation RemoveUserFromTeam($teamUuid: UUID!, $userUuid: UUID!) {
        removeUserFromTeam(teamUuid: $teamUuid, userUuid: $userUuid) {
          success
          message
          team {
            id
            uuid
            name
            members {
              user {
                id
                uuid
                username
              }
              role
            }
          }
        }
      }
    `;

    interface RemoveUserFromTeamData {
      removeUserFromTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<RemoveUserFromTeamData>({
      mutation: REMOVE_USER_FROM_TEAM,
      variables: { teamUuid, userUuid },
    }).pipe(
      map((data) => {
        if (!data.removeUserFromTeam.success) {
          throw new Error(data.removeUserFromTeam.message);
        }
        return data.removeUserFromTeam.team;
      }),
    );
  }

  users(query: string): Observable<User[]> {
    const GQL = gql`
      query GetUsers($query: String!) {
        users(query: $query) {
          results {
            id
            uuid
            username
          }
        }
      }
    `;

    interface Response {
      users: {
        success: boolean;
        message: string;
        results: User[];
      };
    }

    return this.query<Response>({
      query: GQL,
      variables: { query },
    }).pipe(
      map((data) => {
        return data.users.results;
      }),
    );
  }

  deleteTeam(teamUuid: string, confirm: string) {
    const DELETE_TEAM = gql`
      mutation DeleteTeam($teamUuid: UUID!, $confirm: String!) {
        deleteTeam(teamUuid: $teamUuid, confirm: $confirm) {
          success
          message
        }
      }
    `;

    interface Response {
      deleteTeam: {
        success: boolean;
        message: string;
      };
    }

    return this.mutate<Response>({
      mutation: DELETE_TEAM,
      variables: { teamUuid, confirm },
    }).pipe(
      map((data) => {
        if (!data.deleteTeam.success) {
          throw new Error(data.deleteTeam.message);
        }
        return data.deleteTeam;
      }),
    );
  }

  deleteUserResults() {
    const GQL = gql`
      query GetDeleteUserResults {
        deleteUserResults {
          deletingTeams {
            id
            uuid
            name
          }
          leavingTeams {
            id
            uuid
            name
          }
          deletingPodcasts {
            id
            uuid
            name
          }
          leavingPodcasts {
            id
            uuid
            name
          }
        }
      }
    `;

    interface Response {
      deleteUserResults: {
        deletingTeams: TeamsResult[];
        leavingTeams: TeamsResult[];
        deletingPodcasts: PodcastsResult[];
        leavingPodcasts: PodcastsResult[];
      };
    }

    return this.query<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.deleteUserResults;
      }),
    );
  }

  getUserDataExport(exportConfirmation: string) {
    const USER_DATA_EXPORT = gql`
      query UserDataExport($confirm: String!) {
        userDataExport(confirm: $confirm) {
          uuid
          username
          email
          settings {
            key
            value
          }
          teams {
            uuid
            name
          }
          podcasts {
            uuid
            name
            intro
            prompt
            outro
            enabled
            slug
            url
            tgResponse
            tgChannelId
          }
          episodes {
            uuid
            title
            content
            date
            telegramDate
            podcastDate
          }
          jobs {
            uuid
            kind
            status
            result
            args
            createdAt
            updatedAt
          }
        }
      }
    `;

    interface Response {
      userDataExport: {
        id: string;
        username: string;
        email: string;
        settings: { key: string; value: string }[];
        teams: TeamsResult[];
        episodes: Episode[];
        jobs: Job[];
      };
    }

    return this.query<Response>({
      query: USER_DATA_EXPORT,
      variables: { confirm: exportConfirmation },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.userDataExport;
      }),
    );
  }

  // uploadPodcastImage(id: string, image: File): Observable<{ success: boolean; message: string; team: TeamsResult }> {
  //   const GQL = gql`
  //     mutation UpdateTeamPodcastImage($id: ID!, $image: Upload!) {
  //       updateTeam(teamUuid: $id, image: $image) {
  //         success
  //         message
  //         team {
  //           id
  //           name
  //           imageUrl
  //         }
  //       }
  //     }
  //   `;
  //
  //   return this.apollo
  //     .mutate({
  //       mutation: GQL,
  //       variables: {
  //         id,
  //         image,
  //       },
  //       context: {
  //         useMultipart: true,
  //       },
  //     })
  //     .pipe(
  //       // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //       map((result: any) => {
  //         if (!result.data.updateTeam.success) {
  //           throw new Error(result.data.updateTeam.message);
  //         }
  //         return result.data.updateTeam;
  //       }),
  //     );
  // }

  // setTeamRssFeeds(teamUuid: string, rssFeedIds: string[]) {
  //   const GQL = gql`
  //     mutation SetTeamRssFeeds($teamUuid: ID!, $rssFeedIds: [ID!]!) {
  //       setTeamRssFeeds(teamUuid: $teamUuid, rssFeedIds: $rssFeedIds) {
  //         team {
  //           id
  //           rssFeeds {
  //             id
  //             url
  //           }
  //         }
  //       }
  //     }
  //   `;
  //
  //   interface Response {
  //     setTeamRssFeeds: {
  //       team: TeamsResult;
  //     };
  //   }
  //
  //   return this.mutate<Response>({
  //     mutation: GQL,
  //     variables: {
  //       teamUuid,
  //       rssFeedIds,
  //     },
  //   }).pipe(
  //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //     map((result: any) => {
  //       return result.setTeamRssFeeds;
  //     }),
  //   );
  // }

  createRssFeed(url: string) {
    const GQL = gql`
      mutation CreateRssFeed($url: String!) {
        createRssFeed(url: $url) {
          rssFeed {
            id
            uuid
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
