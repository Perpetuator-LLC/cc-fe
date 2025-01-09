import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable } from 'rxjs';
import { TeamsResult } from './teams-list/teams-list.component';
import { map } from 'rxjs/operators';
import { BaseService } from './base.service';
import { User } from './types';
import { Article } from './crypto-article.service';
import { Job } from './job.service';

@Injectable({
  providedIn: 'root',
})
export class TeamsService extends BaseService {
  constructor(protected override apollo: Apollo) {
    super(apollo);
  }

  createTeam(name: string): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const GQL = gql`
      mutation CreateTeam($name: String!) {
        createTeam(name: $name) {
          success
          message
          team {
            id
            name
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

  refreshTgResponse(id: string): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const GQL = gql`
      mutation UpdateTeam($id: ID!, $refreshTgResponse: Boolean) {
        updateTeam(id: $id, refreshTgResponse: $refreshTgResponse) {
          success
          message
          team {
            id
            name
            podcastEnabled
            podcastSlug
            podcastUrl
            intro
            prompt
            outro
            tgChannelId
            tgResponse
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
      updateTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
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
        if (!data.updateTeam.success) {
          throw new Error(data.updateTeam.message);
        }
        return data.updateTeam;
      }),
    );
  }

  updateTeam(
    id: string,
    name: string | null = null,
    intro: string | null = null,
    prompt: string | null = null,
    outro: string | null = null,
    podcastEnabled: boolean | null = null,
    podcastSlug: string | null = null,
    podcastDescription: string | null = null,
    tgBotToken: string | null = null,
    tgChannelId: string | null = null,
    refreshTgResponse: boolean | null = null,
  ): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const GQL = gql`
      mutation UpdateTeam(
        $id: ID!
        $name: String!
        $intro: String
        $prompt: String
        $outro: String
        $podcastEnabled: Boolean
        $podcastSlug: String
        $podcastDescription: String
        $tgBotToken: String
        $tgChannelId: String
        $refreshTgResponse: Boolean
      ) {
        updateTeam(
          id: $id
          name: $name
          intro: $intro
          prompt: $prompt
          outro: $outro
          podcastEnabled: $podcastEnabled
          podcastSlug: $podcastSlug
          podcastDescription: $podcastDescription
          tgBotToken: $tgBotToken
          tgChannelId: $tgChannelId
          refreshTgResponse: $refreshTgResponse
        ) {
          success
          message
          team {
            id
            name
            intro
            prompt
            outro
            podcastEnabled
            podcastSlug
            podcastUrl
            podcastDescription
            tgChannelId
            tgResponse
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
      updateTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
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
        podcastEnabled,
        podcastSlug,
        podcastDescription,
        tgBotToken,
        tgChannelId,
        refreshTgResponse,
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

  getTeamById(id: string): Observable<TeamsResult> {
    const GQL = gql`
      query GetTeamById($id: ID!) {
        team(id: $id) {
          id
          name
          intro
          prompt
          outro
          podcastEnabled
          podcastSlug
          podcastUrl
          podcastImageUrl
          podcastDescription
          tgChannelId
          tgResponse
          members {
            user {
              id
              username
            }
            role
          }
        }
      }
    `;

    interface Response {
      team: TeamsResult;
    }

    return this.watchQuery<Response>({
      query: GQL,
      variables: { id },
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.team) {
          throw new Error('Team data is missing');
        }
        return data.team;
      }),
    );
  }

  getMyTeams(): Observable<TeamsResult[]> {
    const GQL = gql`
      query GetMyTeams {
        myTeams {
          id
          name
          members {
            user {
              id
              username
            }
            role
          }
        }
      }
    `;

    interface Response {
      myTeams: TeamsResult[];
    }

    return this.watchQuery<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        if (!data.myTeams) {
          throw new Error('Teams data is missing');
        }
        return data.myTeams;
      }),
    );
  }

  upsertUserToTeam(teamId: string, userId: string, role: string): Observable<TeamsResult> {
    const GQL = gql`
      mutation UpsertUserToTeam($teamId: ID!, $userId: ID!, $role: String!) {
        upsertUserToTeam(teamId: $teamId, userId: $userId, role: $role) {
          success
          message
          team {
            id
            name
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
      upsertUserToTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<Response>({
      mutation: GQL,
      variables: { teamId, userId, role },
    }).pipe(
      map((data) => {
        if (!data.upsertUserToTeam.success) {
          throw new Error(data.upsertUserToTeam.message);
        }
        return data.upsertUserToTeam.team;
      }),
    );
  }

  removeUserFromTeam(teamId: string, userId: string): Observable<TeamsResult> {
    const REMOVE_USER_FROM_TEAM = gql`
      mutation RemoveUserFromTeam($teamId: ID!, $userId: ID!) {
        removeUserFromTeam(teamId: $teamId, userId: $userId) {
          success
          message
          team {
            id
            name
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

    interface RemoveUserFromTeamData {
      removeUserFromTeam: {
        success: boolean;
        message: string;
        team: TeamsResult;
      };
    }

    return this.mutate<RemoveUserFromTeamData>({
      mutation: REMOVE_USER_FROM_TEAM,
      variables: { teamId, userId },
    }).pipe(
      map((data) => {
        if (!data.removeUserFromTeam.success) {
          throw new Error(data.removeUserFromTeam.message);
        }
        return data.removeUserFromTeam.team;
      }),
    );
  }

  getAllUsers(): Observable<User[]> {
    const GQL = gql`
      query GetAllUsers {
        getAllUsers {
          success
          message
          results {
            id
            username
          }
        }
      }
    `;

    interface Response {
      getAllUsers: {
        success: boolean;
        message: string;
        results: User[];
      };
    }

    return this.query<Response>({
      query: GQL,
    }).pipe(
      map((data) => {
        if (!data.getAllUsers.success) {
          throw new Error(data.getAllUsers.message);
        }
        return data.getAllUsers.results;
      }),
    );
  }

  deleteTeam(teamId: string, confirm: string) {
    const DELETE_TEAM = gql`
      mutation DeleteTeam($teamId: ID!, $confirm: String!) {
        deleteTeam(teamId: $teamId, confirm: $confirm) {
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
      variables: { teamId, confirm },
    }).pipe(
      map((data) => {
        if (!data.deleteTeam.success) {
          throw new Error(data.deleteTeam.message);
        }
        return data.deleteTeam;
      }),
    );
  }

  getDeleteUserResults() {
    const GQL = gql`
      query GetDeleteUserResults {
        getDeleteUserResults {
          deletingTeams {
            id
            name
          }
          leavingTeams {
            id
            name
          }
        }
      }
    `;

    interface Response {
      getDeleteUserResults: {
        deletingTeams: TeamsResult[];
        leavingTeams: TeamsResult[];
      };
    }

    return this.query<Response>({
      query: GQL,
      fetchPolicy: 'network-only',
    }).pipe(
      map((data) => {
        return data.getDeleteUserResults;
      }),
    );
  }

  getUserDataExport(exportConfirmation: string) {
    const USER_DATA_EXPORT = gql`
      query UserDataExport($confirm: String!) {
        userDataExport(confirm: $confirm) {
          id
          username
          email
          settings {
            key
            value
          }
          teams {
            id
            name
            intro
            prompt
            outro
            podcastEnabled
            podcastSlug
            podcastUrl
            tgResponse
            tgChannelId
          }
          articles {
            title
            content
            date
            telegramDate
            podcastDate
            team {
              id
              name
            }
          }
          jobs {
            id
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
        articles: Article[];
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

  uploadPodcastImage(
    id: string,
    podcastImage: File,
  ): Observable<{ success: boolean; message: string; team: TeamsResult }> {
    const GQL = gql`
      mutation UpdateTeamPodcastImage($id: ID!, $podcastImage: Upload!) {
        updateTeam(id: $id, podcastImage: $podcastImage) {
          success
          message
          team {
            id
            name
            podcastImageUrl
          }
        }
      }
    `;

    return this.apollo
      .mutate({
        mutation: GQL,
        variables: {
          id,
          podcastImage,
        },
        context: {
          useMultipart: true,
        },
      })
      .pipe(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map((result: any) => {
          if (!result.data.updateTeam.success) {
            throw new Error(result.data.updateTeam.message);
          }
          return result.data.updateTeam;
        }),
      );
  }
}
